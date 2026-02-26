/**
 * attention-lines.js — SVG overlay for simulated context attention connections
 *
 * Draws thin curved lines between tokens to visualize which previous tokens
 * a new token "attends to". Lines fade in, hold briefly, then fade out.
 *
 * All parameters are read live from module-store.js so slider changes
 * take effect immediately.
 */

import { getParam, isModuleEnabled } from './module-store.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let svg = null;
let wrapperRect = null;
// Active line records: { path, timers: [fadeOutTimer, removeTimer] }
const activeLines = [];

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Create the SVG overlay inside #stage-wrapper. Call once at startup.
 */
export function initAttentionLines() {
  const wrapper = document.getElementById('stage-wrapper');
  if (!wrapper || svg) return;

  svg = document.createElementNS(SVG_NS, 'svg');
  svg.id = 'attention-svg';
  svg.setAttribute('aria-hidden', 'true');
  wrapper.appendChild(svg);

  // Cache wrapper position; update on resize
  cacheWrapperRect();
  window.addEventListener('resize', debounce(onResize, 200));
}

/**
 * Draw attention lines from the newly appended token to random earlier tokens.
 * Called by mock-driver.js each time a token is added.
 *
 * @param {number} newIndex — index of the just-appended token
 */
export function drawAttentionLines(newIndex) {
  if (!svg || newIndex < 1) return;

  const tokens = document.querySelectorAll('#token-stage .token');
  if (newIndex >= tokens.length) return;

  cacheWrapperRect();
  enforceMaxLines();

  const perToken = Math.round(getParam('alPerToken'));
  const count = Math.min(perToken, newIndex);

  // Pick target tokens (distance-weighted: prefer nearby)
  const targets = pickTargets(newIndex, count);

  for (const target of targets) {
    createLine(tokens[newIndex], tokens[target]);
  }
}

/**
 * Remove all lines and cancel pending timers. Called on stage clear.
 */
export function clearLines() {
  for (const rec of activeLines) {
    for (const t of rec.timers) clearTimeout(t);
    rec.path.remove();
  }
  activeLines.length = 0;
}

// ── Target selection ────────────────────────────────────────────────────

function pickTargets(newIndex, count) {
  const picked = new Set();
  let attempts = 0;
  const maxAttempts = count * 4;

  while (picked.size < count && attempts < maxAttempts) {
    attempts++;
    // Distance-weighted: exponential decay favoring nearby tokens
    const u = Math.random();
    // Map uniform random to geometrically-biased index
    const distance = Math.floor(Math.pow(u, 2) * newIndex);
    const target = newIndex - 1 - distance;
    if (target >= 0) picked.add(target);
  }

  return picked;
}

// ── Line creation & lifecycle ───────────────────────────────────────────

function createLine(fromSpan, toSpan) {
  const from = getTokenCenter(fromSpan);
  const to = getTokenCenter(toSpan);
  if (!from || !to) return;

  const opacity = getParam('alOpacity');
  const strokeWidth = getParam('alStrokeWidth');
  const fadeIn = getParam('alFadeIn');
  const holdTime = getParam('alHoldTime');
  const fadeOut = getParam('alFadeOut');

  // Build quadratic Bézier curve — arc upward
  const midX = (from.x + to.x) / 2;
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  // Arc height proportional to distance, capped
  const arcHeight = Math.min(dx * 0.3 + dy * 0.5, 60);
  const midY = Math.min(from.y, to.y) - arcHeight;

  const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('stroke-width', strokeWidth);
  path.style.opacity = '0';
  path.style.transition = `opacity ${fadeIn}ms ease`;
  svg.appendChild(path);

  // Fade in
  requestAnimationFrame(() => {
    path.style.opacity = String(opacity);
  });

  const timers = [];

  // After fade-in + hold, start fade-out
  const fadeOutTimer = setTimeout(() => {
    path.style.transition = `opacity ${fadeOut}ms ease`;
    path.style.opacity = '0';
  }, fadeIn + holdTime);
  timers.push(fadeOutTimer);

  // After full lifecycle, remove from DOM
  const removeTimer = setTimeout(() => {
    path.remove();
    const idx = activeLines.findIndex(r => r.path === path);
    if (idx !== -1) activeLines.splice(idx, 1);
  }, fadeIn + holdTime + fadeOut + 50);
  timers.push(removeTimer);

  activeLines.push({ path, timers });
}

function getTokenCenter(span) {
  if (!wrapperRect) return null;
  const r = span.getBoundingClientRect();
  return {
    x: r.left + r.width / 2 - wrapperRect.left,
    y: r.top + r.height / 2 - wrapperRect.top,
  };
}

// ── Max lines enforcement ───────────────────────────────────────────────

function enforceMaxLines() {
  const maxLines = Math.round(getParam('alMaxLines'));
  while (activeLines.length >= maxLines) {
    const oldest = activeLines.shift();
    for (const t of oldest.timers) clearTimeout(t);
    // Immediate fade-out for evicted lines
    oldest.path.style.transition = 'opacity 200ms ease';
    oldest.path.style.opacity = '0';
    setTimeout(() => oldest.path.remove(), 220);
  }
}

// ── Resize handling ─────────────────────────────────────────────────────

function cacheWrapperRect() {
  const wrapper = document.getElementById('stage-wrapper');
  if (wrapper) wrapperRect = wrapper.getBoundingClientRect();
}

function onResize() {
  // Lines are transient; just clear on resize rather than recalculating
  clearLines();
  cacheWrapperRect();
}

function debounce(fn, ms) {
  let id;
  return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); };
}
