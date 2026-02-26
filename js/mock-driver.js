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
 * All parameters are read from module-store.js on each tick, so UI slider
 * changes take effect immediately without restarting the stream.
 *
 * Axis-agnostic: driven by config.activeAxes { [tag]: {min, max} }.
 */

import { appendToken, updateAxes, popToken } from './renderer.js';
import { getParam, isModuleEnabled } from './module-store.js';
import { drawAttentionLines } from './attention-lines.js';

// Axes that use integer values (most parametric axes and weight)
const INTEGER_AXES = new Set([
  'wght', 'GRAD', 'XOPQ', 'XTRA', 'YOPQ', 'YTAS', 'YTDE', 'YTFI', 'YTLC', 'YTUC',
]);

// Binary axes (0 or 1 only) — values are rounded to nearest integer
const BINARY_AXES = new Set(['ital']);

// Axes whose values should be biased towards extremes (min/max) for higher contrast
const EXTREME_BIAS_AXES = new Set(['wght']);

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

    // Trigger sympathetic pops on a few random existing tokens
    if (isModuleEnabled('sympatheticPops') && idx > 0) {
      triggerSympatheticPops(idx);
    }

    // Draw attention lines from new token to earlier tokens
    if (isModuleEnabled('attentionLines') && idx > 0) {
      drawAttentionLines(idx);
    }

    // Selectively oscillate a subset of existing tokens
    if (isModuleEnabled('oscillation') && idx > 0) {
      oscillateSubset(idx, total, axesCfg, stability);
    }

    i++;

    if (i < tokens.length) {
      const breathEvery = getParam('breathEvery');
      const breathMult = getParam('breathMultiplier');
      const breath = (i % breathEvery === 0) ? baseInterval * breathMult : baseInterval;
      setTimeout(scheduleNext, breath);
    }
  }

  scheduleNext();

  return { stop() { stopped = true; } };
}

// ── sympathetic pops ──────────────────────────────────────────────────────

function triggerSympatheticPops(currentCount) {
  const popMin = getParam('popCountMin');
  const popMax = getParam('popCountMax');
  const staggerMin = 20;
  const staggerMax = 50;

  const count = popMin + Math.floor(Math.random() * (popMax - popMin + 1));
  const picks = Math.min(count, currentCount);

  // Pick random unique indices from [0, currentCount)
  const indices = new Set();
  let attempts = 0;
  while (indices.size < picks && attempts < picks * 3) {
    indices.add(Math.floor(Math.random() * currentCount));
    attempts++;
  }

  // Stagger the pops slightly so they don't all fire at the exact same frame
  let delay = 0;
  for (const idx of indices) {
    setTimeout(() => popToken(idx), delay);
    delay += staggerMin + Math.random() * (staggerMax - staggerMin);
  }
}

// ── selective oscillation ─────────────────────────────────────────────────

function oscillateSubset(newIndex, total, axesCfg, stability) {
  // Decide which tokens get disturbed this round
  const disturbed = isModuleEnabled('disturbance')
    ? pickDisturbedTokens(newIndex, stability)
    : pickAllTokens(newIndex);

  // Update stability counters (only if stability module is enabled)
  if (isModuleEnabled('stability')) {
    for (let j = 0; j < newIndex; j++) {
      if (disturbed.has(j)) {
        stability[j] = 0;
      } else {
        stability[j]++;
      }
    }
  }

  if (disturbed.size === 0) return;

  const steps = getParam('oscillationSteps');
  const stepMs = getParam('stepMs');

  for (let step = 0; step < steps; step++) {
    const isLast = step === steps - 1;
    setTimeout(() => {
      for (const j of disturbed) {
        if (isLast) {
          updateAxes(j, computeAxes(j, total, axesCfg));
        } else {
          updateAxes(j, computeAxesOscillation(j, total, step, axesCfg));
        }
      }
    }, step * stepMs);
  }
}

// When disturbance module is off, oscillate all existing tokens
function pickAllTokens(newIndex) {
  const set = new Set();
  for (let j = 0; j < newIndex; j++) set.add(j);
  return set;
}

function pickDisturbedTokens(newIndex, stability) {
  const maxDisturbFraction = getParam('maxDisturbFraction');
  const nearbyWindow = getParam('nearbyWindow');
  const settleThreshold = getParam('settleThreshold');
  const rippleChance = getParam('rippleChance');

  const set = new Set();
  const maxDisturb = Math.max(1, Math.floor(newIndex * maxDisturbFraction));

  for (let j = 0; j < newIndex; j++) {
    if (set.size >= maxDisturb) break;

    const age = newIndex - j; // how far back this token is
    const isNearby = age <= nearbyWindow;
    const isSettled = isModuleEnabled('stability') && stability[j] >= settleThreshold;

    let probability;
    if (isSettled) {
      // Settled tokens: very rare ripple, even rarer the older they are
      probability = rippleChance / (1 + age * 0.05);
    } else if (isNearby) {
      // Recent unsettled tokens: high chance of being disturbed
      probability = 0.7 - (age / nearbyWindow) * 0.4;
    } else {
      // Distant unsettled tokens: moderate chance that decays with distance
      probability = 0.25 / (1 + (age - nearbyWindow) * 0.15);
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

  const ampBase = getParam('oscillationAmpBase');
  const ampDecay = getParam('oscillationAmpDecay');

  const sign = (step % 2 === 0) ? 1 : -1;
  const amp = ampBase * Math.pow(ampDecay, step);

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
  const decayCoeff = isModuleEnabled('axisCurve') ? 0.02 : 0;
  const biasExp = isModuleEnabled('axisCurve') ? getParam('extremeBiasExponent') : 1.0;

  const decay = 1 / (1 + decayCoeff * total);
  const result = {};
  const tags = Object.keys(axesCfg);

  tags.forEach((tag, i) => {
    const { min, max } = axesCfg[tag];
    const mid = (min + max) / 2;
    const halfRange = (max - min) / 2;

    // Unique phase per axis so they don't all pulse together
    const phase = j * (0.41 + i * 0.07) + total * (0.13 + i * 0.03);
    let sinVal = Math.sin(phase);

    if (EXTREME_BIAS_AXES.has(tag) && biasExp !== 1.0) {
      // Push values towards ±1 (extremes) using a power curve with sign preservation
      // exponent < 1 compresses the middle and stretches the extremes
      sinVal = Math.sign(sinVal) * Math.pow(Math.abs(sinVal), biasExp);
    }

    const raw = mid + halfRange * decay * sinVal;

    result[tag] = quantize(tag, raw);
  });

  return result;
}
