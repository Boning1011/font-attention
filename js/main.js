import "../css/style.css";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#text-canvas");
const svg = $("#attention-arcs");
const timeline = $("#timeline");
const playButton = $("#play-toggle");
const speedButton = $("#speed");
const speeds = [0.5, 1, 1.5, 2];
let replay;
let position = 0;
let playing = true;
let speedIndex = 1;
let lastStep = performance.now();

const formatToken = (token) => token.replace(/Ġ/g, " ").replace(/Ċ/g, "\n");
const cleanToken = (token) => formatToken(token).replace(/\n/g, "↵").trim() || "space";

function renderTokens() {
  canvas.innerHTML = replay.tokens.map((token, index) => {
    const axes = replay.frames[index].axes;
    const classes = ["token", index > position ? "future" : "", index === position ? "active" : ""].filter(Boolean).join(" ");
    return `<span class="${classes}" data-index="${index}" style="--wght:${axes.wght};--wdth:${axes.wdth};--slnt:${axes.slnt};--opsz:${axes.opsz}">${formatToken(token)}</span>`;
  }).join("");
  markLinks();
}

function markLinks() {
  canvas.querySelectorAll(".linked").forEach((node) => node.classList.remove("linked"));
  replay.frames[position].links.forEach(({ index }) => canvas.querySelector(`[data-index="${index}"]`)?.classList.add("linked"));
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
  const active = canvas.querySelector(`[data-index="${position}"]`);
  if (!active) return;
  const activeRect = active.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
  svg.innerHTML = replay.frames[position].links.map((link) => {
    const target = canvas.querySelector(`[data-index="${link.index}"]`);
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

function setPosition(next) {
  position = Math.max(0, Math.min(replay.tokens.length - 1, Number(next)));
  timeline.value = position;
  $("#counter").textContent = `${String(position+1).padStart(2,"0")} / ${String(replay.tokens.length).padStart(2,"0")}`;
  renderTokens(); renderInspector(); requestAnimationFrame(renderArcs);
}

function animationLoop(now) {
  if (playing && now-lastStep > 850/speeds[speedIndex]) {
    setPosition(position === replay.tokens.length-1 ? 0 : position+1); lastStep = now;
  }
  requestAnimationFrame(animationLoop);
}

async function start() {
  replay = await fetch("./data/qwen3-sonnet-18.json").then((response) => { if (!response.ok) throw new Error("Replay data unavailable"); return response.json(); });
  timeline.max = replay.tokens.length-1;
  $("#model-label").textContent = `${replay.meta.model.toUpperCase()} / ${replay.meta.source}`;
  $("#method-copy").textContent = replay.meta.method;
  setPosition(0);
  requestAnimationFrame(animationLoop);
}

playButton.addEventListener("click", () => { playing = !playing; playButton.textContent = playing ? "PAUSE" : "PLAY"; playButton.setAttribute("aria-label", playing ? "Pause replay" : "Play replay"); lastStep = performance.now(); });
$("#restart").addEventListener("click", () => { setPosition(0); playing = true; playButton.textContent = "PAUSE"; lastStep = performance.now(); });
timeline.addEventListener("input", (event) => { setPosition(event.target.value); lastStep = performance.now(); });
speedButton.addEventListener("click", () => { speedIndex = (speedIndex+1)%speeds.length; speedButton.textContent = `${speeds[speedIndex]}×`; });
window.addEventListener("resize", () => requestAnimationFrame(renderArcs));
start().catch((error) => { canvas.innerHTML = `<p>Could not load attention replay.<br><small>${error.message}</small></p>`; });
