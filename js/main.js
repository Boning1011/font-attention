import "../css/style.css";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#text-canvas");
const svg = $("#attention-arcs");
const marksSvg = $("#attention-marks");
const marginNotes = $("#margin-notes");
const timeline = $("#timeline");
const playButton = $("#play-toggle");
const speedButton = $("#speed");
const fontSelect = $("#font-select");
const mappingSelect = $("#mapping-select");
const speeds = [0.5, 1, 1.5, 2];
const TOKEN_INTERVAL_MS = 210;
const END_HOLD_MS = 3200;
const FONT_STORAGE_KEY = "font-attention:typeface:v6";
const TUNING_STORAGE_KEY = "font-attention:tuning:v3";
const FONT_PRESETS = {
  mixed: {
    family: "Courier Prime",
    load: ['72px "Courier Prime"', '72px "Special Elite"', '72px "Cutive Mono"'],
  },
  "special-elite": { family: "Special Elite", load: '72px "Special Elite"' },
  "courier-prime": { family: "Courier Prime", load: '72px "Courier Prime"' },
  "cutive-mono": { family: "Cutive Mono", load: '72px "Cutive Mono"' },
};
const TOKEN_FONT_PATTERN = [
  "courier-prime", "special-elite", "cutive-mono", "courier-prime",
  "special-elite", "cutive-mono", "courier-prime", "special-elite",
  "cutive-mono", "courier-prime", "special-elite", "cutive-mono",
];
const TOKEN_STYLE_PATTERN = [
  "roman", "italic", "roman", "small-caps",
  "roman", "italic", "small-caps", "roman",
  "italic-small-caps", "roman", "italic", "roman",
];
const UPPERCASE_PATTERN = new Set([4, 7, 8, 11, 12, 15, 16, 26, 30, 32, 37, 41]);
const DEFAULT_TUNING = { mapping: "balanced", variation: 135, motion: 25, links: 5, tension: 55 };
const MAPPING_PRESETS = {
  balanced: { wght: 1, wdth: 1, slnt: 1, opsz: 1 },
  weight: { wght: 1.45, wdth: 0.65, slnt: 0.7, opsz: 0.7 },
  width: { wght: 0.7, wdth: 1.55, slnt: 0.75, opsz: 0.75 },
  italic: { wght: 0.7, wdth: 0.75, slnt: 1.7, opsz: 0.7 },
  optical: { wght: 0.7, wdth: 0.75, slnt: 0.7, opsz: 1.65 },
};
const IMPRINT_PATTERN = [
  { wght: 0, wdth: 0, slnt: 0, opsz: 0 },
  { wght: 28, wdth: -2, slnt: -0.25, opsz: 3 },
  { wght: 0, wdth: 0, slnt: 0, opsz: 0 },
  { wght: -18, wdth: 1, slnt: 0, opsz: -2 },
  { wght: 46, wdth: -3, slnt: -0.6, opsz: 4 },
  { wght: 0, wdth: 0, slnt: 0, opsz: 0 },
  { wght: 12, wdth: 2, slnt: -0.2, opsz: -2 },
  { wght: 0, wdth: 0, slnt: 0, opsz: 0 },
  { wght: -30, wdth: 3, slnt: 0, opsz: -3 },
  { wght: 22, wdth: -1, slnt: -0.4, opsz: 2 },
  { wght: 0, wdth: 0, slnt: 0, opsz: 0 },
  { wght: 38, wdth: 2, slnt: -0.5, opsz: -1 },
  { wght: -12, wdth: -2, slnt: -0.2, opsz: 3 },
];
const PRINT_PATTERN = [
  [0, 0, 0.96, 0], [0.35, -1.2, 0.91, -0.7], [0, 0.7, 0.95, 0.35], [-0.25, 1.55, 0.9, 0.8],
  [0.45, -0.65, 0.98, -0.35], [0, 0, 0.94, 0], [-0.18, -1.65, 0.89, 1.05], [0, 0.45, 0.95, -0.25],
  [0.28, 1.3, 0.92, 0.55], [-0.4, -0.85, 0.97, -0.9], [0, 0, 0.94, 0], [0.2, -1.4, 0.9, 0.7],
  [-0.12, 1.1, 0.96, -0.45],
];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const AXIS_LIMITS = {
  wght: [100, 1000], wdth: [25, 151], slnt: [-10, 0], opsz: [8, 144],
};

let replay;
let tokenElements = [];
let stability = [];
let effectTimers = [];
let position = 0;
let playing = true;
let speedIndex = 1;
let lastStep = performance.now();
let tuning = { ...DEFAULT_TUNING };
let annotationSnapshot = { bucket: -1, markup: "" };

const formatToken = (token) => token.replace(/Ġ/g, " ").replace(/Ċ/g, "\n");
const cleanToken = (token) => formatToken(token).replace(/\n/g, "↵").trim() || "space";
const clamp = (value, [minimum, maximum]) => Math.max(minimum, Math.min(maximum, value));

function loadTuning() {
  try {
    const stored = JSON.parse(localStorage.getItem(TUNING_STORAGE_KEY) || "null");
    if (!stored || typeof stored !== "object") return { ...DEFAULT_TUNING };
    return {
      mapping: stored.mapping in MAPPING_PRESETS ? stored.mapping : DEFAULT_TUNING.mapping,
      variation: DEFAULT_TUNING.variation,
      motion: DEFAULT_TUNING.motion,
      links: DEFAULT_TUNING.links,
      tension: DEFAULT_TUNING.tension,
    };
  } catch {
    return { ...DEFAULT_TUNING };
  }
}

function mapAttentionAxes(axes, index = -1) {
  const preset = MAPPING_PRESETS[tuning.mapping] || MAPPING_PRESETS.balanced;
  const amount = tuning.variation / 100;
  const centers = { wght: 390, wdth: 105, slnt: -4.5, opsz: 70 };
  const mapped = Object.fromEntries(Object.entries(centers).map(([axis, center]) => [
    axis,
    clamp(center + (Number(axes[axis]) - center) * amount * preset[axis], AXIS_LIMITS[axis]),
  ]));
  if (index < 0) return mapped;
  const imprint = IMPRINT_PATTERN[index % IMPRINT_PATTERN.length];
  return Object.fromEntries(Object.entries(mapped).map(([axis, value]) => [
    axis,
    clamp(value + imprint[axis], AXIS_LIMITS[axis]),
  ]));
}

function createTokens() {
  canvas.innerHTML = "";
  let line = document.createElement("span");
  line.className = "text-line";
  canvas.appendChild(line);
  tokenElements = replay.tokens.map((rawToken, index) => {
    const token = formatToken(rawToken);
    const span = document.createElement("span");
    span.className = "token future";
    span.dataset.index = String(index);
    span.dataset.tokenFont = TOKEN_FONT_PATTERN[index % TOKEN_FONT_PATTERN.length];
    span.dataset.tokenStyle = TOKEN_STYLE_PATTERN[index % TOKEN_STYLE_PATTERN.length];
    span.dataset.tokenCase = UPPERCASE_PATTERN.has(index) ? "upper" : "source";
    span.textContent = token.replace(/\n/g, "");
    const [printX, printY, inkDensity, printRotate] = PRINT_PATTERN[index % PRINT_PATTERN.length];
    span.style.setProperty("--print-x", `${printX}px`);
    span.style.setProperty("--print-y", `${printY}px`);
    span.style.setProperty("--print-rotate", `${printRotate}deg`);
    span.style.setProperty("--ink-density", String(inkDensity));
    span.style.setProperty("--print-shadow", `${printX >= 0 ? ".014em" : "-.014em"} .006em rgba(27,26,23,.14)`);
    applyAxes(span, replay.frames[index].axes);
    line.appendChild(span);
    span.style.width = `${span.getBoundingClientRect().width}px`;
    if (token.includes("\n") && index < replay.tokens.length - 1) {
      line = document.createElement("span");
      line.className = "text-line";
      canvas.appendChild(line);
    }
    return span;
  });
  stability = new Array(tokenElements.length).fill(0);
}

function applyAxes(element, axes) {
  const mapped = mapAttentionAxes(axes, Number(element.dataset.index));
  for (const [axis, limits] of Object.entries(AXIS_LIMITS)) {
    element.style.setProperty(`--${axis}`, String(clamp(Number(mapped[axis]), limits)));
  }
  const widthNorm = (mapped.wdth - 25) / 126;
  const slant = mapped.slnt;
  element.style.setProperty("--typewriter-wght", String(clamp(mapped.wght, [320, 700])));
  element.style.setProperty("--typewriter-slant", `${(slant * .62).toFixed(2)}deg`);
  element.style.setProperty("--typewriter-track", `${(-0.035 + widthNorm * .025).toFixed(4)}em`);
}

function lockTokenWidths() {
  tokenElements.forEach((element) => { element.style.width = "auto"; });
  tokenElements.forEach((element) => { element.style.width = `${element.getBoundingClientRect().width}px`; });
}

async function setTypeface(value, persist = true) {
  const preset = FONT_PRESETS[value] || FONT_PRESETS.mixed;
  canvas.dataset.font = value in FONT_PRESETS ? value : "mixed";
  fontSelect.value = canvas.dataset.font;
  if (persist) localStorage.setItem(FONT_STORAGE_KEY, canvas.dataset.font);
  const loads = Array.isArray(preset.load) ? preset.load : [preset.load];
  await Promise.all(loads.map((font) => document.fonts.load(font)));
  if (tokenElements.length) {
    lockTokenWidths();
    annotationSnapshot.bucket = -1;
    requestAnimationFrame(renderArcs);
  }
}

function syncTuningControls() {
  mappingSelect.value = tuning.mapping;
}

function getVisibleLinks() {
  return replay.frames[position].links.slice(0, tuning.links);
}

function applyTuning() {
  syncTuningControls();
  try { localStorage.setItem(TUNING_STORAGE_KEY, JSON.stringify(tuning)); } catch { /* storage unavailable */ }
  if (!replay || !tokenElements.length) return;
  clearEffects();
  lockTokenWidths();
  updateTokenState();
  renderInspector();
  annotationSnapshot.bucket = -1;
  requestAnimationFrame(renderArcs);
}

function restoreBaseAxes() {
  tokenElements.forEach((element, index) => applyAxes(element, replay.frames[index].axes));
}

function clearEffects() {
  effectTimers.forEach(clearTimeout);
  effectTimers = [];
  tokenElements.forEach((element) => element.classList.remove("shifting"));
  restoreBaseAxes();
}

function updateTokenState() {
  const isComplete = position === tokenElements.length - 1;
  tokenElements.forEach((element, index) => {
    element.classList.toggle("future", index > position);
    element.classList.toggle("active", index === position);
    element.classList.remove("linked");
  });
  if (!isComplete) getVisibleLinks().forEach(({ index }) => tokenElements[index]?.classList.add("linked"));
}

function replayAnimation(element, className, duration, delay = 0) {
  const timer = setTimeout(() => {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    effectTimers.push(setTimeout(() => element.classList.remove(className), duration));
  }, delay);
  effectTimers.push(timer);
}

function pickDisturbedTokens() {
  const disturbed = new Set(replay.frames[position].links.map(({ index }) => index));
  const maximum = Math.max(2, Math.floor(position * 0.35));

  for (let index = position - 1; index >= 0 && disturbed.size < maximum; index -= 1) {
    const age = position - index;
    const settled = stability[index] >= 5;
    const nearbyProbability = Math.max(0.18, 0.78 - age * 0.075);
    const rippleProbability = 0.035 / (1 + age * 0.05);
    const sample = ((index * 37 + position * 19) % 101) / 100;
    if (sample < (settled ? rippleProbability : nearbyProbability)) disturbed.add(index);
  }

  for (let index = 0; index < position; index += 1) {
    stability[index] = disturbed.has(index) ? 0 : stability[index] + 1;
  }
  return [...disturbed];
}

function oscillateDisturbedTokens() {
  const disturbed = position > 0 ? pickDisturbedTokens() : [];
  disturbed.push(position);
  const steps = [1, -0.58, 0.3, -0.12, 0];
  steps.forEach((amplitude, step) => {
    effectTimers.push(setTimeout(() => {
      disturbed.forEach((index) => {
        const base = replay.frames[index].axes;
        const phase = (index + position + step) % 2 === 0 ? 1 : -1;
        const swing = phase * amplitude;
        applyAxes(tokenElements[index], {
          wght: base.wght + swing * 260,
          wdth: base.wdth - swing * 34,
          slnt: amplitude === 0 ? base.slnt : swing > 0 ? -10 : 0,
          opsz: base.opsz + swing * 34,
        });
      });
      if (step === steps.length - 1) requestAnimationFrame(renderArcs);
    }, step * 30));
  });
}

function triggerMotion() {
  if (reducedMotion) return;
  oscillateDisturbedTokens();
  const picks = [position, ...getVisibleLinks().slice(0, 2).map(({ index }) => index)];
  picks.forEach((index, order) => {
    const element = tokenElements[index];
    if (element) {
      element.style.setProperty("--shift-x", `${(seededNoise(position * 31 + index * 7) * 1.15).toFixed(2)}px`);
      element.style.setProperty("--shift-y", `${(seededNoise(position * 19 + index * 11) * 1.05).toFixed(2)}px`);
      element.style.setProperty("--shift-r", `${(seededNoise(position * 23 + index * 13) * .55).toFixed(2)}deg`);
      replayAnimation(element, "shifting", 300, order * 14);
    }
  });
}

function makeWeightScribble(link, order) {
  const length = 13 + Math.min(1, link.weight) * 62;
  const count = Math.max(5, Math.round(length / 5));
  const points = Array.from({ length: count + 1 }, (_, index) => {
    const progress = index / count;
    const x = 2.5 + progress * (length - 5);
    const y = 7 + Math.sin(progress * Math.PI * (1.8 + order * .13)) * .5
      + seededNoise(position * 43 + link.index * 17 + order * 7 + index) * .7;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const echo = points.split(" ").map((point, index) => {
    const [x, y] = point.split(",").map(Number);
    return `${x.toFixed(1)},${(y - 1.15 + seededNoise(link.index * 29 + index) * .45).toFixed(1)}`;
  }).join(" ");
  const startY = Number(points.split(" ")[0].split(",")[1]);
  const endY = Number(points.split(" ").at(-1).split(",")[1]);
  return `<span class="weight-scribble" style="--weight-length:${length.toFixed(1)}px" role="img" aria-label="${Math.round(link.weight * 100)} percent attention weight"><svg viewBox="0 0 ${length.toFixed(1)} 14" aria-hidden="true"><polyline class="marker-main" points="${points}"/><polyline class="marker-grain" points="${echo}"/><ellipse class="marker-cap" cx="2.6" cy="${startY.toFixed(1)}" rx="2.7" ry="3.2" transform="rotate(${(seededNoise(link.index + order) * 9).toFixed(1)} 2.6 ${startY.toFixed(1)})"/><ellipse class="marker-cap end" cx="${(length - 2.5).toFixed(1)}" cy="${endY.toFixed(1)}" rx="2.5" ry="3.4" transform="rotate(${(seededNoise(link.index * 3 + order + 11) * 10).toFixed(1)} ${(length - 2.5).toFixed(1)} ${endY.toFixed(1)})"/></svg></span>`;
}

function renderInspector() {
  const links = getVisibleLinks();
  $("#margin-link-list").innerHTML = links.map((link, order) => `<div class="margin-link${order === 0 ? " strongest" : ""}" data-link-index="${link.index}" style="--note-rotate:${seededNoise(position * 17 + link.index * 5 + order) * 2.4}deg;--note-shift:${seededNoise(position * 11 + link.index * 3 + order) * 3.5}px"><span>${cleanToken(replay.tokens[link.index])}</span>${makeWeightScribble(link, order)}</div>`).join("");
}

function seededNoise(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

function makeInkStroke(start, end, link, order, maximumWeight, redInk = false) {
  const tension = tuning.tension / 100;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const sameLine = Math.abs(dy) < 18;
  const bend = sameLine
    ? (18 + distance * .055) * (order % 2 ? -1 : 1)
    : (14 + Math.min(distance, 460) * .045) * (order % 2 ? -1 : 1);
  const pointCount = Math.max(14, Math.min(34, Math.round(distance / 24)));
  const points = [];
  for (let index = 0; index <= pointCount; index += 1) {
    const progress = index / pointCount;
    const envelope = Math.sin(Math.PI * progress);
    const drift = Math.sin(progress * Math.PI * (2.2 + order * .31) + order * .8) * (1.2 + tension * 2.1);
    const grain = seededNoise((position + 1) * 101 + link.index * 37 + order * 17 + index) * (0.55 + tension * .8) * envelope;
    points.push({
      x: start.x + dx * progress + normalX * (bend * envelope + drift + grain),
      y: start.y + dy * progress + normalY * (bend * envelope + drift + grain),
    });
  }
  const compressed = Math.pow(link.weight / maximumWeight, .28);
  const strength = .28 + compressed * .72;
  const baseWidth = (1 + strength * 1.65) * (redInk ? .78 : 1);
  const segments = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    const pressure = .72 + Math.sin((index / pointCount) * Math.PI) * .38 + seededNoise(index + link.index * 11) * .13;
    const dry = (index + order * 3 + link.index) % (redInk ? 7 : 11) === 0;
    return `<line x1="${point.x.toFixed(2)}" y1="${point.y.toFixed(2)}" x2="${next.x.toFixed(2)}" y2="${next.y.toFixed(2)}" stroke-width="${(baseWidth * pressure).toFixed(2)}" opacity="${(dry ? .42 : .58 + strength * .36).toFixed(2)}"/>`;
  }).join("");
  const flecks = points.filter((_, index) => index > 2 && index < points.length - 3 && (index + link.index) % 9 === 0).map((point, index) =>
    `<circle cx="${(point.x + seededNoise(index + order) * 1.8).toFixed(2)}" cy="${(point.y + seededNoise(index + link.index) * 1.8).toFixed(2)}" r="${(.25 + strength * .32).toFixed(2)}" opacity=".32"/>`
  ).join("");
  return `<g class="ink-stroke${redInk ? " red-ink" : ""}" filter="url(#ink-wobble-${order})">${segments}<circle cx="${start.x}" cy="${start.y}" r="${(baseWidth * .48).toFixed(2)}" opacity=".68"/><circle cx="${end.x}" cy="${end.y}" r="${(baseWidth * .48).toFixed(2)}" opacity=".68"/>${flecks}</g>`;
}

function tokenShape(rect, stageRect, kind = "rect") {
  return {
    kind,
    cx: rect.left + rect.width / 2 - stageRect.left,
    cy: rect.top + rect.height / 2 - stageRect.top,
    rx: rect.width / 2 + (kind === "ellipse" ? 9 : 2),
    ry: rect.height / 2 + (kind === "ellipse" ? 6 : 2),
  };
}

function boundaryToward(shape, point) {
  const dx = point.x - shape.cx;
  const dy = point.y - shape.cy;
  if (Math.abs(dx) + Math.abs(dy) < .001) return { x: shape.cx, y: shape.cy };
  const scale = shape.kind === "ellipse"
    ? 1 / Math.sqrt((dx * dx) / (shape.rx * shape.rx) + (dy * dy) / (shape.ry * shape.ry))
    : 1 / Math.max(Math.abs(dx) / shape.rx, Math.abs(dy) / shape.ry);
  return { x: shape.cx + dx * scale, y: shape.cy + dy * scale };
}

function closestConnection(activeShape, targetShape) {
  const targetCenter = { x: targetShape.cx, y: targetShape.cy };
  const activeCenter = { x: activeShape.cx, y: activeShape.cy };
  return {
    start: boundaryToward(activeShape, targetCenter),
    end: boundaryToward(targetShape, activeCenter),
  };
}

function linkedMark(link, order) {
  if (order === 0) return "red-circle";
  const marks = ["strikeout", "underline", "none", "circle"];
  return marks[(link.index + order * 3) % marks.length];
}

function makeScribbleEllipse(shape, seed, className) {
  const count = 39;
  const startAngle = -.34 * Math.PI + seededNoise(seed * 7) * .13;
  const sweep = Math.PI * (1.78 + (seededNoise(seed * 11) + 1) * .045);
  const points = Array.from({ length: count + 1 }, (_, index) => {
    const progress = index / count;
    const angle = startAngle + progress * sweep;
    const pressureNoise = seededNoise(seed * 41 + index) * .58;
    return {
      x: shape.cx + Math.cos(angle) * (shape.rx + pressureNoise) + seededNoise(seed + index * 3) * .28,
      y: shape.cy + Math.sin(angle) * (shape.ry + pressureNoise * .5) + seededNoise(seed + index * 5) * .32,
    };
  });
  const segments = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    const width = .72 + (seededNoise(seed + index * 19) + 1) * .27;
    const dry = (index + seed) % 17 === 0;
    return `<line x1="${point.x.toFixed(2)}" y1="${point.y.toFixed(2)}" x2="${next.x.toFixed(2)}" y2="${next.y.toFixed(2)}" stroke-width="${width.toFixed(2)}" style="--mark-opacity:${dry ? .42 : .82}"/>`;
  }).join("");
  return `<g class="${className}">${segments}</g>`;
}

function makeHandUnderline(rect, stageRect, seed) {
  const startX = rect.left - stageRect.left - 2;
  const endX = rect.right - stageRect.left + 4;
  const baseY = rect.bottom - stageRect.top + 4 + seededNoise(seed) * 1.4;
  const count = Math.max(7, Math.min(17, Math.round((endX - startX) / 10)));
  const points = Array.from({ length: count + 1 }, (_, index) => {
    const progress = index / count;
    return {
      x: startX + (endX - startX) * progress,
      y: baseY + Math.sin(progress * Math.PI * (2.4 + seed % 3)) * 1.15 + seededNoise(seed * 31 + index) * 1.05,
    };
  });
  const segments = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    const width = 1.15 + (seededNoise(seed + index * 7) + 1) * .65;
    const dry = (index + seed) % 8 === 0;
    return `<line x1="${point.x.toFixed(2)}" y1="${point.y.toFixed(2)}" x2="${next.x.toFixed(2)}" y2="${next.y.toFixed(2)}" stroke-width="${width.toFixed(2)}" style="--draw:${index};--mark-opacity:${dry ? .25 : .76}"/>`;
  }).join("");
  return `<g class="hand-underline">${segments}</g>`;
}

function makeStrikeout(rect, stageRect, seed) {
  const left = rect.left - stageRect.left - 5;
  const right = rect.right - stageRect.left + 6;
  const centerY = rect.top + rect.height * .56 - stageRect.top;
  let segments = "";
  for (let pass = 0; pass < 5; pass += 1) {
    const reverse = pass % 2 === 1;
    const count = Math.max(7, Math.min(18, Math.round((right - left) / 8)));
    const points = Array.from({ length: count + 1 }, (_, index) => {
      const progress = index / count;
      const x = left + (right - left) * (reverse ? 1 - progress : progress);
      return {
        x: x + seededNoise(seed * 13 + pass * 37 + index) * 1.7,
        y: centerY + (pass - 2) * 1.75 + Math.sin(progress * Math.PI * (2 + pass)) * 1.45 + seededNoise(seed * 19 + index) * 1.15,
      };
    });
    segments += points.slice(0, -1).map((point, index) => {
      const next = points[index + 1];
      const width = 2.7 + (seededNoise(seed + pass * 23 + index) + 1) * 1.4;
      const opacity = (index + pass + seed) % 11 === 0 ? .88 : 1;
      return `<line x1="${point.x.toFixed(2)}" y1="${point.y.toFixed(2)}" x2="${next.x.toFixed(2)}" y2="${next.y.toFixed(2)}" stroke-width="${width.toFixed(2)}" style="--draw:${index + pass * count};--mark-opacity:${opacity.toFixed(2)}"/>`;
    }).join("");
  }
  const blotX = left + (right - left) * (.28 + (seed % 4) * .12);
  return `<g class="strikeout">${segments}<ellipse cx="${blotX.toFixed(2)}" cy="${(centerY + seededNoise(seed) * 2).toFixed(2)}" rx="${(4 + Math.abs(seededNoise(seed + 8)) * 4.5).toFixed(2)}" ry="${(2.4 + Math.abs(seededNoise(seed + 11)) * 2.5).toFixed(2)}" opacity=".95"/></g>`;
}

function renderArcs() {
  const stageRect = $(".stage").getBoundingClientRect();
  const active = tokenElements[position];
  if (!active) return;
  const isComplete = position === tokenElements.length - 1;
  svg.classList.toggle("settled", isComplete);
  marksSvg.classList.toggle("settled", isComplete);
  marginNotes.classList.toggle("settled", isComplete);
  if (isComplete) return;
  if (position === 0) annotationSnapshot = { bucket: -1, markup: "" };
  const activeRect = active.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
  marksSvg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
  const links = getVisibleLinks();
  const maximumWeight = Math.max(...links.map(({ weight }) => weight), 0.0001);
  const activeShape = tokenShape(activeRect, stageRect, "ellipse");
  const decoratedLinks = links.map((link, order) => {
    const target = tokenElements[link.index];
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    const mark = linkedMark(link, order);
    return {
      link, order, rect, mark,
      shape: tokenShape(rect, stageRect, mark.includes("circle") ? "ellipse" : "rect"),
    };
  }).filter(Boolean);
  const filters = links.map((link, order) => `<filter id="ink-wobble-${order}" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".015 .11" numOctaves="2" seed="${position + link.index + order + 3}" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale=".7"/></filter>`).join("");
  const strokes = decoratedLinks.map(({ link, order, shape }) => {
    const { start, end } = closestConnection(activeShape, shape);
    return makeInkStroke(start, end, link, order, maximumWeight, order === 0);
  }).join("");
  const linkedAnnotations = decoratedLinks.map(({ link, order, rect, mark, shape }) => {
    if (mark === "red-circle") return makeScribbleEllipse(shape, position * 43 + link.index * 7 + order, "linked-circle red-ink");
    if (mark === "circle") return makeScribbleEllipse(shape, position * 43 + link.index * 7 + order, "linked-circle");
    if (mark === "underline") return makeHandUnderline(rect, stageRect, position * 29 + link.index * 5 + order);
    if (mark === "strikeout") return makeStrikeout(rect, stageRect, position * 31 + link.index * 11 + order);
    return "";
  }).join("");
  const activeCircle = makeScribbleEllipse(activeShape, position * 47 + 13, "active-circle");
  const annotationBucket = Math.floor(position / 3);
  if (annotationSnapshot.bucket !== annotationBucket) {
    annotationSnapshot = { bucket: annotationBucket, markup: linkedAnnotations + activeCircle };
  }
  svg.innerHTML = `<defs>${filters}</defs>${strokes}`;
  marksSvg.innerHTML = `<g class="annotations">${annotationSnapshot.markup}</g>`;
}

function setPosition(next, animate = true) {
  clearEffects();
  position = Math.max(0, Math.min(replay.tokens.length - 1, Number(next)));
  timeline.value = position;
  $("#counter").textContent = `${String(position+1).padStart(2,"0")} / ${String(replay.tokens.length).padStart(2,"0")}`;
  updateTokenState();
  renderInspector();
  requestAnimationFrame(renderArcs);
  if (animate) triggerMotion();
}

function animationLoop(now) {
  const interval = position === replay?.tokens.length - 1 ? END_HOLD_MS : TOKEN_INTERVAL_MS / speeds[speedIndex];
  if (playing && now-lastStep > interval) {
    setPosition(position === replay.tokens.length-1 ? 0 : position+1);
    lastStep = now;
  }
  requestAnimationFrame(animationLoop);
}

async function start() {
  replay = await fetch("./data/qwen3-sonnet-18.json").then((response) => { if (!response.ok) throw new Error("Replay data unavailable"); return response.json(); });
  tuning = loadTuning();
  syncTuningControls();
  timeline.max = replay.tokens.length-1;
  $("#model-label").textContent = `${replay.meta.model.toUpperCase()} / ${replay.meta.source}`;
  const savedTypeface = localStorage.getItem(FONT_STORAGE_KEY) || "mixed";
  await setTypeface(savedTypeface, false);
  await document.fonts.ready;
  createTokens();
  setPosition(0);
  requestAnimationFrame(animationLoop);
}

playButton.addEventListener("click", () => { playing = !playing; playButton.textContent = playing ? "PAUSE" : "PLAY"; playButton.setAttribute("aria-label", playing ? "Pause replay" : "Play replay"); lastStep = performance.now(); });
$("#restart").addEventListener("click", () => { stability.fill(0); setPosition(0); playing = true; playButton.textContent = "PAUSE"; lastStep = performance.now(); });
timeline.addEventListener("input", (event) => { setPosition(event.target.value); lastStep = performance.now(); });
speedButton.addEventListener("click", () => { speedIndex = (speedIndex+1)%speeds.length; speedButton.textContent = `${speeds[speedIndex]}×`; });
fontSelect.addEventListener("change", (event) => setTypeface(event.target.value));
mappingSelect.addEventListener("change", (event) => { tuning.mapping = event.target.value; applyTuning(); });
window.addEventListener("resize", () => {
  annotationSnapshot.bucket = -1;
  requestAnimationFrame(renderArcs);
});
start().catch((error) => { canvas.innerHTML = `<p>Could not load attention replay.<br><small>${error.message}</small></p>`; });
