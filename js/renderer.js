/**
 * renderer.js — Token rendering engine
 *
 * Pure rendering layer: appends tokens to #token-stage, manages their
 * font-variation-settings, and triggers entry animations.
 * Knows nothing about where the data comes from.
 */

const stage = document.getElementById('token-stage');
const tokenSpans = [];

/**
 * Append a single token to the stage with an entry animation.
 *
 * @param {{ text: string, wght?: number, slnt?: number }} tokenData
 * @returns {number} Index of the newly appended token.
 */
export function appendToken({ text, wght = 400, slnt = 0 }) {
  const span = document.createElement('span');
  span.className = 'token entering';
  span.textContent = text;
  span.style.fontVariationSettings = `"wght" ${wght}, "slnt" ${slnt}`;

  span.addEventListener('animationend', () => {
    span.classList.remove('entering');
  }, { once: true });

  stage.appendChild(span);
  tokenSpans.push(span);
  return tokenSpans.length - 1;
}

/**
 * Update the font-variation axis values of an existing token.
 * CSS transition handles the smooth interpolation automatically.
 *
 * @param {number} index
 * @param {{ wght?: number, slnt?: number }} newAxes
 */
export function updateAxes(index, newAxes) {
  const span = tokenSpans[index];
  if (!span) return;

  const style = span.style;
  // Parse current values so we can do partial updates
  const current = parseFVS(style.fontVariationSettings);
  if (newAxes.wght !== undefined) current.wght = newAxes.wght;
  if (newAxes.slnt !== undefined) current.slnt = newAxes.slnt;
  style.fontVariationSettings = `"wght" ${current.wght}, "slnt" ${current.slnt}`;
}

/**
 * Clear all tokens and reset state.
 */
export function clearStage() {
  stage.innerHTML = '';
  tokenSpans.length = 0;
}

/**
 * @returns {number} Current number of tokens on stage.
 */
export function getTokenCount() {
  return tokenSpans.length;
}

// ── helpers ──────────────────────────────────────────────────────────────

function parseFVS(fvs) {
  const result = { wght: 400, slnt: 0 };
  if (!fvs) return result;
  const re = /"(\w+)"\s+([-\d.]+)/g;
  let m;
  while ((m = re.exec(fvs))) {
    result[m[1]] = parseFloat(m[2]);
  }
  return result;
}
