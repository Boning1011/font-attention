import "../css/style.css";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#text-canvas");
const svg = $("#attention-arcs");
const timeline = $("#timeline");
const playButton = $("#play-toggle");
const speedButton = $("#speed");
const speeds = [0.5, 1, 1.5, 2];
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

const formatToken = (token) => token.replace(/Ġ/g, " ").replace(/Ċ/g, "\n");
const cleanToken = (token) => formatToken(token).replace(/\n/g, "↵").trim() || "space";
const clamp = (value, [minimum, maximum]) => Math.max(minimum, Math.min(maximum, value));

function createTokens() {
  canvas.innerHTML = "";
  tokenElements = replay.tokens.map((rawToken, index) => {
    const token = formatToken(rawToken);
    const span = document.createElement("span");
    span.className = "token future";
    span.dataset.index = String(index);
    span.textContent = token.replace(/\n/g, "");
    applyAxes(span, replay.frames[index].axes);
    canvas.appendChild(span);
    span.style.width = `${span.getBoundingClientRect().width}px`;
    if (token.includes("\n")) canvas.appendChild(document.createElement("br"));
    return span;
  });
  stability = new Array(tokenElements.length).fill(0);
}

function applyAxes(element, axes) {
  for (const [axis, limits] of Object.entries(AXIS_LIMITS)) {
    element.style.setProperty(`--${axis}`, String(clamp(Number(axes[axis]), limits)));
  }
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
  tokenElements.forEach((element, index) => {
    element.classList.toggle("future", index > position);
    element.classList.toggle("active", index === position);
    element.classList.remove("linked");
  });
  replay.frames[position].links.forEach(({ index }) => tokenElements[index]?.classList.add("linked"));
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
  for (let offset = 1; offset <= position && picks.size < 5; offset += 1) {
    const candidate = (position * 7 + offset * 11) % position;
    picks.add(candidate);
  }
  [...picks].slice(0, 5).forEach((index, order) => {
    const element = tokenElements[index];
    if (element) replayAnimation(element, "popping", 410, order * 38);
  });
}

function oscillateDisturbedTokens() {
  const disturbed = pickDisturbedTokens();
  const steps = [1, -0.58, 0.3, -0.12, 0];
  steps.forEach((amplitude, step) => {
    effectTimers.push(setTimeout(() => {
      disturbed.forEach((index) => {
        const base = replay.frames[index].axes;
        const phase = (index + position + step) % 2 === 0 ? 1 : -1;
        applyAxes(tokenElements[index], {
          wght: base.wght + phase * amplitude * 170,
          wdth: base.wdth - phase * amplitude * 19,
          slnt: base.slnt + phase * amplitude * 3.5,
          opsz: base.opsz + phase * amplitude * 18,
        });
      });
      if (step === steps.length - 1) requestAnimationFrame(renderArcs);
    }, step * 48));
  });
}

function triggerMotion() {
  if (reducedMotion) return;
  const active = tokenElements[position];
  if (active) replayAnimation(active, "entering", 440);
  if (position > 0) {
    triggerSympatheticPops();
    oscillateDisturbedTokens();
  }
}

function renderInspector() {
  const frame = replay.frames[position];
  $("#active-token").textContent = cleanToken(replay.tokens[position]);
  const definitions = [
    ["WGHT", frame.axes.wght, 100, 1000], ["WDTH", frame.axes.wdth, 25, 151],
    ["SLNT", frame.axes.slnt, -10, 0], ["OPSZ", frame.axes.opsz, 8, 144],
  ];
  $("#axis-list").innerHTML = definitions.map(([name,value,min,max]) => `<div class="axis-row"><span>${name}</span><div class="axis-track"><div class="axis-fill" style="width:${((value-min)/(max-min))*100}%"></div></div><span class="axis-value">${Number(value).toFixed(name === "SLNT" ? 1 : 0)}</span></div>`).join("");
  $("#link-list").innerHTML = frame.links.length ? frame.links.map((link) => `<div class="link-row"><span>${cleanToken(replay.tokens[link.index])}</span><span>${Math.round(link.weight*100)}%</span></div>`).join("") : '<div class="link-row"><span>beginning of sequence</span><span>—</span></div>';
}

function renderArcs() {
  const stageRect = $(".stage").getBoundingClientRect();
  const active = tokenElements[position];
  if (!active) return;
  const activeRect = active.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
  svg.innerHTML = replay.frames[position].links.map((link) => {
    const target = tokenElements[link.index];
    if (!target) return "";
    const rect = target.getBoundingClientRect();
    const x1 = activeRect.left + activeRect.width / 2 - stageRect.left;
    const y1 = activeRect.top - stageRect.top - 7;
    const x2 = rect.left + rect.width / 2 - stageRect.left;
    const y2 = rect.top - stageRect.top - 7;
    const lift = Math.max(22, Math.min(135, Math.abs(x1-x2)*.18 + Math.abs(y1-y2)*.3));
    return `<path d="M ${x1} ${y1} C ${x1} ${y1-lift}, ${x2} ${y2-lift}, ${x2} ${y2}" stroke-width="${1+link.weight*7}" opacity="${.2+link.weight*.8}"/>`;
  }).join("");
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
  if (playing && now-lastStep > 850/speeds[speedIndex]) {
    setPosition(position === replay.tokens.length-1 ? 0 : position+1);
    lastStep = now;
  }
  requestAnimationFrame(animationLoop);
}

async function start() {
  replay = await fetch("./data/qwen3-sonnet-18.json").then((response) => { if (!response.ok) throw new Error("Replay data unavailable"); return response.json(); });
  timeline.max = replay.tokens.length-1;
  $("#model-label").textContent = `${replay.meta.model.toUpperCase()} / ${replay.meta.source}`;
  $("#method-copy").textContent = replay.meta.method;
  await document.fonts.ready;
  createTokens();
  setPosition(0);
  requestAnimationFrame(animationLoop);
}

playButton.addEventListener("click", () => { playing = !playing; playButton.textContent = playing ? "PAUSE" : "PLAY"; playButton.setAttribute("aria-label", playing ? "Pause replay" : "Play replay"); lastStep = performance.now(); });
$("#restart").addEventListener("click", () => { stability.fill(0); setPosition(0); playing = true; playButton.textContent = "PAUSE"; lastStep = performance.now(); });
timeline.addEventListener("input", (event) => { setPosition(event.target.value); lastStep = performance.now(); });
speedButton.addEventListener("click", () => { speedIndex = (speedIndex+1)%speeds.length; speedButton.textContent = `${speeds[speedIndex]}×`; });
window.addEventListener("resize", () => requestAnimationFrame(renderArcs));
start().catch((error) => { canvas.innerHTML = `<p>Could not load attention replay.<br><small>${error.message}</small></p>`; });
