import "../css/style.css";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#text-canvas");
const svg = $("#attention-arcs");
const timeline = $("#timeline");
const playButton = $("#play-toggle");
const speedButton = $("#speed");
const fontSelect = $("#font-select");
const mappingSelect = $("#mapping-select");
const variationControl = $("#variation-control");
const motionControl = $("#motion-control");
const linksControl = $("#links-control");
const tensionControl = $("#tension-control");
const speeds = [0.5, 1, 1.5, 2];
const TOKEN_INTERVAL_MS = 160;
const END_HOLD_MS = 3200;
const FONT_STORAGE_KEY = "font-attention:typeface:v3";
const TUNING_STORAGE_KEY = "font-attention:tuning:v2";
const FONT_PRESETS = {
  mixed: {
    family: "Recursive",
    load: ['72px "Recursive"', '72px "Roboto Flex"', '72px "Roboto Serif"', '72px "InterVariable"', '72px "Archivo"'],
  },
  "roboto-flex": { family: "Roboto Flex", load: '72px "Roboto Flex"' },
  recursive: { family: "Recursive", load: '72px "Recursive"' },
  "roboto-serif": { family: "Roboto Serif", load: '72px "Roboto Serif"' },
  inter: { family: "InterVariable", load: '72px "InterVariable"' },
  archivo: { family: "Archivo", load: '72px "Archivo"' },
};
const TOKEN_FONT_PATTERN = [
  "recursive", "roboto-serif", "recursive", "inter", "archivo", "recursive",
  "roboto-flex", "recursive", "roboto-serif", "archivo", "recursive", "inter",
];
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

const formatToken = (token) => token.replace(/Ġ/g, " ").replace(/Ċ/g, "\n");
const cleanToken = (token) => formatToken(token).replace(/\n/g, "↵").trim() || "space";
const clamp = (value, [minimum, maximum]) => Math.max(minimum, Math.min(maximum, value));

function loadTuning() {
  try {
    const stored = JSON.parse(localStorage.getItem(TUNING_STORAGE_KEY) || "null");
    if (!stored || typeof stored !== "object") return { ...DEFAULT_TUNING };
    return {
      mapping: stored.mapping in MAPPING_PRESETS ? stored.mapping : DEFAULT_TUNING.mapping,
      variation: clamp(Number(stored.variation) || DEFAULT_TUNING.variation, [60, 180]),
      motion: clamp(Number(stored.motion) || 0, [0, 100]),
      links: clamp(Number(stored.links) || DEFAULT_TUNING.links, [2, 6]),
      tension: clamp(Number(stored.tension) || 0, [0, 100]),
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
  const opticalNorm = (mapped.opsz - 8) / 136;
  const slant = mapped.slnt;
  element.style.setProperty("--recursive-wght", String(clamp(mapped.wght, [300, 1000])));
  element.style.setProperty("--recursive-slnt", String(slant * 1.5));
  element.style.setProperty("--casl", String((0.1 + widthNorm * 0.55).toFixed(3)));
  element.style.setProperty("--crsv", slant < -5 ? "1" : ".5");
  element.style.setProperty("--mono-axis", String((0.72 + (1 - opticalNorm) * 0.28).toFixed(3)));
  element.style.setProperty("--serif-wght", String(clamp(mapped.wght, [100, 900])));
  element.style.setProperty("--serif-wdth", String((50 + widthNorm * 100).toFixed(2)));
  element.style.setProperty("--serif-slant", `${slant}deg`);
  element.style.setProperty("--grad", String((-50 + opticalNorm * 150).toFixed(2)));
  element.style.setProperty("--inter-wght", String(clamp(mapped.wght, [100, 900])));
  element.style.setProperty("--inter-opsz", String((14 + opticalNorm * 18).toFixed(2)));
  element.style.setProperty("--inter-slant", `${slant}deg`);
  element.style.setProperty("--archivo-wght", String(clamp(mapped.wght, [100, 900])));
  element.style.setProperty("--archivo-wdth", String((62 + widthNorm * 63).toFixed(2)));
  element.style.setProperty("--archivo-slant", `${slant}deg`);
  element.style.setProperty("--archivo-track", `${(-0.065 + opticalNorm * 0.045).toFixed(4)}em`);
}

function lockTokenWidths() {
  tokenElements.forEach((element) => { element.style.width = "auto"; });
  tokenElements.forEach((element) => { element.style.width = `${element.getBoundingClientRect().width}px`; });
}

async function setTypeface(value, persist = true) {
  const preset = FONT_PRESETS[value] || FONT_PRESETS["roboto-flex"];
  canvas.dataset.font = value in FONT_PRESETS ? value : "roboto-flex";
  fontSelect.value = canvas.dataset.font;
  $("#active-token").style.fontFamily = `"${preset.family}", sans-serif`;
  if (persist) localStorage.setItem(FONT_STORAGE_KEY, canvas.dataset.font);
  const loads = Array.isArray(preset.load) ? preset.load : [preset.load];
  await Promise.all(loads.map((font) => document.fonts.load(font)));
  if (tokenElements.length) {
    lockTokenWidths();
    requestAnimationFrame(renderArcs);
  }
}

function setMotionVariables() {
  const amount = tuning.motion / 100;
  const root = document.documentElement.style;
  root.setProperty("--enter-y", `${(-0.2 * amount).toFixed(3)}em`);
  root.setProperty("--enter-scale", String((1 + 0.32 * amount).toFixed(3)));
  root.setProperty("--enter-blur", `${(4.8 * amount).toFixed(2)}px`);
  root.setProperty("--enter-settle-y", `${(0.04 * amount).toFixed(3)}em`);
  root.setProperty("--enter-settle-scale", String((1 - 0.02 * amount).toFixed(3)));
  root.setProperty("--pop-y", `${(-0.16 * amount).toFixed(3)}em`);
  root.setProperty("--pop-scale", String((1 + 0.12 * amount).toFixed(3)));
  root.setProperty("--pop-blur", `${(0.8 * amount).toFixed(2)}px`);
  root.setProperty("--pop-settle-y", `${(0.032 * amount).toFixed(3)}em`);
  root.setProperty("--pop-settle-scale", String((1 - 0.012 * amount).toFixed(3)));
}

function syncTuningControls() {
  mappingSelect.value = tuning.mapping;
  variationControl.value = tuning.variation;
  motionControl.value = tuning.motion;
  linksControl.value = tuning.links;
  tensionControl.value = tuning.tension;
  variationControl.nextElementSibling.value = `${tuning.variation}%`;
  motionControl.nextElementSibling.value = `${tuning.motion}%`;
  linksControl.nextElementSibling.value = String(tuning.links);
  tensionControl.nextElementSibling.value = `${tuning.tension}%`;
  setMotionVariables();
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
  requestAnimationFrame(renderArcs);
}

function restoreBaseAxes() {
  tokenElements.forEach((element, index) => applyAxes(element, replay.frames[index].axes));
}

function clearEffects() {
  effectTimers.forEach(clearTimeout);
  effectTimers = [];
  tokenElements.forEach((element) => element.classList.remove("entering", "popping"));
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

function triggerSympatheticPops() {
  const linked = replay.frames[position].links.map(({ index }) => index);
  const picks = new Set(linked);
  for (let offset = 1; offset <= position && picks.size < 2; offset += 1) {
    const candidate = (position * 7 + offset * 11) % position;
    picks.add(candidate);
  }
  [...picks].slice(0, 2).forEach((index, order) => {
    const element = tokenElements[index];
    if (element) replayAnimation(element, "popping", 410, order * 38);
  });
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
  const active = tokenElements[position];
  oscillateDisturbedTokens();
  if (active && position % 3 === 0) replayAnimation(active, "entering", 440);
  if (position > 0 && position % 3 === 0) {
    triggerSympatheticPops();
  }
}

function renderInspector() {
  const frame = replay.frames[position];
  const mapped = mapAttentionAxes(frame.axes, position);
  $("#active-token").textContent = cleanToken(replay.tokens[position]);
  $("#active-token").style.fontFamily = getComputedStyle(tokenElements[position]).fontFamily;
  const definitions = [
    ["WGHT", mapped.wght, 100, 1000], ["WDTH", mapped.wdth, 25, 151],
    ["SLNT", mapped.slnt, -10, 0], ["OPSZ", mapped.opsz, 8, 144],
  ];
  $("#axis-list").innerHTML = definitions.map(([name,value,min,max]) => `<div class="axis-row"><span>${name}</span><div class="axis-track"><div class="axis-fill" style="width:${((value-min)/(max-min))*100}%"></div></div><span class="axis-value">${Number(value).toFixed(name === "SLNT" ? 1 : 0)}</span></div>`).join("");
  const links = getVisibleLinks();
  $("#link-list").innerHTML = links.length ? links.map((link) => `<div class="link-row"><span>${cleanToken(replay.tokens[link.index])}</span><span>${Math.round(link.weight*100)}%</span></div>`).join("") : '<div class="link-row"><span>beginning of sequence</span><span>—</span></div>';
}

function seededNoise(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

function makeInkStroke(start, end, link, order, maximumWeight) {
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
  const baseWidth = 1 + strength * 1.65;
  const segments = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    const pressure = .72 + Math.sin((index / pointCount) * Math.PI) * .38 + seededNoise(index + link.index * 11) * .13;
    const dry = (index + order * 3 + link.index) % 11 === 0;
    return `<line x1="${point.x.toFixed(2)}" y1="${point.y.toFixed(2)}" x2="${next.x.toFixed(2)}" y2="${next.y.toFixed(2)}" stroke-width="${(baseWidth * pressure).toFixed(2)}" opacity="${(dry ? .24 : .35 + strength * .46).toFixed(2)}"/>`;
  }).join("");
  const flecks = points.filter((_, index) => index > 2 && index < points.length - 3 && (index + link.index) % 9 === 0).map((point, index) =>
    `<circle cx="${(point.x + seededNoise(index + order) * 1.8).toFixed(2)}" cy="${(point.y + seededNoise(index + link.index) * 1.8).toFixed(2)}" r="${(.25 + strength * .32).toFixed(2)}" opacity=".32"/>`
  ).join("");
  return `<g class="ink-stroke" filter="url(#ink-wobble-${order})">${segments}<circle cx="${start.x}" cy="${start.y}" r="${(baseWidth * .48).toFixed(2)}" opacity=".68"/><circle cx="${end.x}" cy="${end.y}" r="${(baseWidth * .48).toFixed(2)}" opacity=".68"/>${flecks}</g>`;
}

function tokenConnectionPoints(activeRect, targetRect, stageRect) {
  const active = {
    top: activeRect.top - stageRect.top,
    bottom: activeRect.bottom - stageRect.top,
    x: activeRect.left + activeRect.width / 2 - stageRect.left,
  };
  const target = {
    top: targetRect.top - stageRect.top,
    bottom: targetRect.bottom - stageRect.top,
    x: targetRect.left + targetRect.width / 2 - stageRect.left,
  };
  if (target.top < active.top - 12) return { start: { x: target.x, y: target.bottom + 2 }, end: { x: active.x, y: active.top - 3 } };
  if (target.top > active.top + 12) return { start: { x: active.x, y: active.bottom + 2 }, end: { x: target.x, y: target.top - 3 } };
  return { start: { x: target.x, y: target.bottom + 2 }, end: { x: active.x, y: active.top - 3 } };
}

function renderArcs() {
  const stageRect = $(".stage").getBoundingClientRect();
  const active = tokenElements[position];
  if (!active) return;
  const isComplete = position === tokenElements.length - 1;
  svg.classList.toggle("settled", isComplete);
  if (isComplete) return;
  const activeRect = active.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
  const links = getVisibleLinks();
  const maximumWeight = Math.max(...links.map(({ weight }) => weight), 0.0001);
  const filters = links.map((link, order) => `<filter id="ink-wobble-${order}" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".015 .11" numOctaves="2" seed="${position + link.index + order + 3}" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale=".7"/></filter>`).join("");
  const strokes = links.map((link, order) => {
    const target = tokenElements[link.index];
    if (!target) return "";
    const rect = target.getBoundingClientRect();
    const { start, end } = tokenConnectionPoints(activeRect, rect, stageRect);
    return makeInkStroke(start, end, link, order, maximumWeight);
  }).join("");
  svg.innerHTML = `<defs>${filters}</defs>${strokes}`;
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
  $("#method-copy").textContent = replay.meta.method;
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
variationControl.addEventListener("input", (event) => { tuning.variation = Number(event.target.value); applyTuning(); });
motionControl.addEventListener("input", (event) => { tuning.motion = Number(event.target.value); applyTuning(); });
linksControl.addEventListener("input", (event) => { tuning.links = Number(event.target.value); applyTuning(); });
tensionControl.addEventListener("input", (event) => { tuning.tension = Number(event.target.value); applyTuning(); });
$("#reset-tuning").addEventListener("click", () => { tuning = { ...DEFAULT_TUNING }; applyTuning(); });
window.addEventListener("resize", () => requestAnimationFrame(renderArcs));
start().catch((error) => { canvas.innerHTML = `<p>Could not load attention replay.<br><small>${error.message}</small></p>`; });
