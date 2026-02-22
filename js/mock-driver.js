/**
 * mock-driver.js — Simulated token stream with attention redistribution
 *
 * When a new token appears, existing tokens' axes rapidly oscillate
 * (overshoot → undershoot → settle) before locking to their final values,
 * simulating the "jitter then commit" feel of attention redistribution.
 *
 * Axis-agnostic: driven by config.activeAxes { [tag]: {min, max} }.
 */

import { appendToken, updateAxes } from './renderer.js';

// Axes that use integer values (most parametric axes and weight)
const INTEGER_AXES = new Set([
  'wght', 'GRAD', 'XOPQ', 'XTRA', 'YOPQ', 'YTAS', 'YTDE', 'YTFI', 'YTLC', 'YTUC',
]);

// Binary axes (0 or 1 only) — values are rounded to nearest integer
const BINARY_AXES = new Set(['ital']);

/**
 * Stream tokens with rhythmic pacing and oscillating axis updates.
 *
 * @param {string[]} tokens
 * @param {{ activeAxes: Record<string, {min: number, max: number}> }} config
 * @param {number} baseInterval — base ms between tokens (default 100)
 * @returns {{ stop: () => void }}
 */
export function streamTokens(tokens, config, baseInterval = 100) {
  let i = 0;
  let stopped = false;
  const axesCfg = config.activeAxes;

  function scheduleNext() {
    if (stopped || i >= tokens.length) return;

    const idx = i;
    const total = idx + 1;

    appendToken({ text: tokens[idx], axes: computeAxes(idx, total, axesCfg) });

    if (idx > 0) {
      oscillateAll(idx, total, axesCfg);
    }

    i++;

    if (i < tokens.length) {
      const breath = (i % 6 === 0) ? baseInterval * 1.8 : baseInterval;
      setTimeout(scheduleNext, breath);
    }
  }

  scheduleNext();

  return { stop() { stopped = true; } };
}

// ── oscillation ──────────────────────────────────────────────────────────

const OSCILLATION_STEPS = 4;
const STEP_MS = 35;

function oscillateAll(newIndex, total, axesCfg) {
  for (let step = 0; step < OSCILLATION_STEPS; step++) {
    const isLast = step === OSCILLATION_STEPS - 1;
    setTimeout(() => {
      for (let j = 0; j < newIndex; j++) {
        if (isLast) {
          updateAxes(j, computeAxes(j, total, axesCfg));
        } else {
          updateAxes(j, computeAxesOscillation(j, total, step, axesCfg));
        }
      }
    }, step * STEP_MS);
  }
}

function computeAxesOscillation(j, total, step, axesCfg) {
  const target = computeAxes(j, total, axesCfg);
  const prev = computeAxes(j, total - 1, axesCfg);

  const sign = (step % 2 === 0) ? 1 : -1;
  const amp = 1.6 * Math.pow(0.5, step);

  const result = {};
  for (const tag of Object.keys(axesCfg)) {
    const delta = target[tag] - prev[tag];
    const raw = target[tag] + sign * amp * delta;
    result[tag] = quantize(tag, raw);
  }
  return result;
}

// ── axis computation ─────────────────────────────────────────────────────

function quantize(tag, raw) {
  if (BINARY_AXES.has(tag)) return Math.round(raw) ? 1 : 0;
  if (INTEGER_AXES.has(tag)) return Math.round(raw);
  return parseFloat(raw.toFixed(2));
}

function computeAxes(j, total, axesCfg) {
  const decay = 1 / (1 + 0.02 * total);
  const result = {};
  const tags = Object.keys(axesCfg);

  tags.forEach((tag, i) => {
    const { min, max } = axesCfg[tag];
    const mid = (min + max) / 2;
    const halfRange = (max - min) / 2;

    // Unique phase per axis so they don't all pulse together
    const phase = j * (0.41 + i * 0.07) + total * (0.13 + i * 0.03);
    const raw = mid + halfRange * decay * Math.sin(phase);

    result[tag] = quantize(tag, raw);
  });

  return result;
}
