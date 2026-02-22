/**
 * mock-driver.js — Simulated token stream with attention redistribution
 *
 * Replaceable data source: streams tokens one-by-one and recalculates
 * axis values for all existing tokens on each step, simulating how
 * attention weights shift as the sequence grows.
 */

import { appendToken, updateAxes } from './renderer.js';

/**
 * Stream tokens onto the stage at a fixed interval.
 * Each time a new token appears, all previous tokens' axes are
 * recalculated to simulate attention redistribution.
 *
 * @param {string[]} tokens  — array of text strings (word + trailing space)
 * @param {number}   interval — ms between tokens (default 120)
 * @returns {{ stop: () => void }} handle to cancel the stream
 */
export function streamTokens(tokens, interval = 120) {
  let i = 0;
  const timer = setInterval(() => {
    if (i >= tokens.length) {
      clearInterval(timer);
      return;
    }

    const total = i + 1;
    const axes = computeAxes(i, total);
    appendToken({ text: tokens[i], ...axes });

    // Redistribute axes for all preceding tokens
    for (let j = 0; j < i; j++) {
      updateAxes(j, computeAxes(j, total));
    }

    i++;
  }, interval);

  return {
    stop() { clearInterval(timer); }
  };
}

// ── axis computation ─────────────────────────────────────────────────────

/**
 * Compute axis values for token at position `j` when the total sequence
 * length is `total`.
 *
 * Design:
 *   - Incommensurate phases (0.41, 0.70) ensure variation never aligns
 *     with word or sentence boundaries.
 *   - `total` shifts the phase and applies a gentle decay, simulating
 *     attention dilution as the sequence grows.
 *   - wght range: ~320–480 (±80 around 400, shrinking with decay)
 *   - slnt range: ~−4..0  (subtle lean, shrinking with decay)
 */
function computeAxes(j, total) {
  const phase = j * 0.41 + total * 0.13;
  const decay = 1 / (1 + 0.02 * total);

  const wght = Math.round(400 + 80 * decay * Math.sin(phase));
  const slnt = parseFloat(
    (-2 * decay * (Math.sin(j * 0.70 + total * 0.09) + 1)).toFixed(1)
  );

  return { wght, slnt };
}
