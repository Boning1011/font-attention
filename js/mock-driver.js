/**
 * mock-driver.js — Simulated token stream with attention redistribution
 *
 * When a new token appears, existing tokens' axes rapidly oscillate
 * (overshoot → undershoot → settle) before locking to their final values,
 * simulating the "jitter then commit" feel of attention redistribution.
 */

import { appendToken, updateAxes } from './renderer.js';

/**
 * Stream tokens with rhythmic pacing and oscillating axis updates.
 *
 * @param {string[]} tokens
 * @param {number}   baseInterval — base ms between tokens (default 100)
 * @returns {{ stop: () => void }}
 */
export function streamTokens(tokens, baseInterval = 100) {
  let i = 0;
  let stopped = false;

  function scheduleNext() {
    if (stopped || i >= tokens.length) return;

    const idx = i;
    const total = idx + 1;

    // Append the new token with its initial axes
    appendToken({ text: tokens[idx], ...computeAxes(idx, total) });

    // Oscillate all preceding tokens then lock
    if (idx > 0) {
      oscillateAll(idx, total);
    }

    i++;

    if (i < tokens.length) {
      // Rhythm: every ~6 tokens, take a slightly longer breath
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

/**
 * Rapidly oscillate all tokens [0..newIndex-1] through several overshoot
 * frames, then snap to the final target value.
 */
function oscillateAll(newIndex, total) {
  for (let step = 0; step < OSCILLATION_STEPS; step++) {
    const isLast = step === OSCILLATION_STEPS - 1;
    setTimeout(() => {
      for (let j = 0; j < newIndex; j++) {
        if (isLast) {
          // Final frame: lock to target
          updateAxes(j, computeAxes(j, total));
        } else {
          // Intermediate frame: overshoot with decaying amplitude
          updateAxes(j, computeAxesOscillation(j, total, step));
        }
      }
    }, step * STEP_MS);
  }
}

/**
 * Compute an oscillation frame for token j.
 * Each step overshoots the target in alternating directions
 * with decaying amplitude: ±overshoot * (decay ^ step)
 */
function computeAxesOscillation(j, total, step) {
  const target = computeAxes(j, total);
  const prev = computeAxes(j, total - 1);

  // Direction alternates: +1, -1, +1, ...
  const sign = (step % 2 === 0) ? 1 : -1;
  // Amplitude decays each step: 1.6, 0.8, 0.4, ...
  const amp = 1.6 * Math.pow(0.5, step);

  const deltaW = target.wght - prev.wght;
  const deltaS = target.slnt - prev.slnt;

  return {
    wght: Math.round(target.wght + sign * amp * deltaW),
    slnt: parseFloat((target.slnt + sign * amp * deltaS).toFixed(1)),
  };
}

// ── axis computation ─────────────────────────────────────────────────────

function computeAxes(j, total) {
  const phase = j * 0.41 + total * 0.13;
  const decay = 1 / (1 + 0.02 * total);

  const wght = Math.round(400 + 80 * decay * Math.sin(phase));
  const slnt = parseFloat(
    (-2 * decay * (Math.sin(j * 0.70 + total * 0.09) + 1)).toFixed(1)
  );

  return { wght, slnt };
}
