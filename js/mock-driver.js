/**
 * mock-driver.js — Simulated token stream with attention redistribution
 *
 * Animation behavior:
 *   1. New token pops in with initial axis values
 *   2. Only a random SUBSET of existing tokens oscillate (not all)
 *   3. Tokens "stabilize" over time — the older a token is relative to the
 *      latest token, the less likely it is to be disturbed
 *   4. Once a token has been stable for several rounds, it rarely changes;
 *      only an occasional "ripple" reaches settled tokens
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
 * Stream tokens with rhythmic pacing and selective axis updates.
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

  // Per-token stability counter: how many rounds since this token was last disturbed
  const stability = [];

  function scheduleNext() {
    if (stopped || i >= tokens.length) return;

    const idx = i;
    const total = idx + 1;

    // Append the new token
    appendToken({ text: tokens[idx], axes: computeAxes(idx, total, axesCfg) });
    stability.push(0); // new token starts unstable

    // Selectively oscillate a subset of existing tokens
    if (idx > 0) {
      oscillateSubset(idx, total, axesCfg, stability);
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

// ── selective oscillation ─────────────────────────────────────────────────

const OSCILLATION_STEPS = 4;
const STEP_MS = 35;

// How many rounds of stability before a token is "settled"
const SETTLE_THRESHOLD = 5;

// Probability that a settled token gets a rare ripple
const RIPPLE_CHANCE = 0.03;

// Maximum fraction of existing tokens that oscillate per round
const MAX_DISTURB_FRACTION = 0.35;

// Tokens within this distance from the new token are more likely to be disturbed
const NEARBY_WINDOW = 8;

function oscillateSubset(newIndex, total, axesCfg, stability) {
  // Decide which tokens get disturbed this round
  const disturbed = pickDisturbedTokens(newIndex, stability);

  // Increment stability for undisturbed tokens, reset for disturbed ones
  for (let j = 0; j < newIndex; j++) {
    if (disturbed.has(j)) {
      stability[j] = 0;
    } else {
      stability[j]++;
    }
  }

  if (disturbed.size === 0) return;

  for (let step = 0; step < OSCILLATION_STEPS; step++) {
    const isLast = step === OSCILLATION_STEPS - 1;
    setTimeout(() => {
      for (const j of disturbed) {
        if (isLast) {
          updateAxes(j, computeAxes(j, total, axesCfg));
        } else {
          updateAxes(j, computeAxesOscillation(j, total, step, axesCfg));
        }
      }
    }, step * STEP_MS);
  }
}

function pickDisturbedTokens(newIndex, stability) {
  const set = new Set();
  const maxDisturb = Math.max(1, Math.floor(newIndex * MAX_DISTURB_FRACTION));

  for (let j = 0; j < newIndex; j++) {
    if (set.size >= maxDisturb) break;

    const age = newIndex - j; // how far back this token is
    const isNearby = age <= NEARBY_WINDOW;
    const isSettled = stability[j] >= SETTLE_THRESHOLD;

    let probability;
    if (isSettled) {
      // Settled tokens: very rare ripple, even rarer the older they are
      probability = RIPPLE_CHANCE / (1 + age * 0.05);
    } else if (isNearby) {
      // Recent unsettled tokens: high chance of being disturbed
      probability = 0.7 - (age / NEARBY_WINDOW) * 0.4;
    } else {
      // Distant unsettled tokens: moderate chance that decays with distance
      probability = 0.25 / (1 + (age - NEARBY_WINDOW) * 0.15);
    }

    if (Math.random() < probability) {
      set.add(j);
    }
  }

  return set;
}

// ── oscillation helpers ───────────────────────────────────────────────────

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

// ── axis computation ──────────────────────────────────────────────────────

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
