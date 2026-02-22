/**
 * renderer.js — Token rendering engine
 *
 * Pure rendering layer: appends tokens to #token-stage, manages their
 * font-variation-settings, and triggers entry animations.
 * Knows nothing about where the data comes from.
 *
 * Axis-agnostic: accepts any set of axes as a Record<string, number>.
 */

const stage = document.getElementById('token-stage');
const tokenSpans = [];

/**
 * Append a single token to the stage with an entry animation.
 *
 * @param {{ text: string, axes?: Record<string, number> }} tokenData
 * @returns {number} Index of the newly appended token.
 */
export function appendToken({ text, axes = {} }) {
  const span = document.createElement('span');
  span.className = 'token entering';
  span.textContent = text;
  span.style.fontVariationSettings = serializeFVS(axes);

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
 * @param {Record<string, number>} newAxes — partial update: only provided axes are changed
 */
export function updateAxes(index, newAxes) {
  const span = tokenSpans[index];
  if (!span) return;

  const current = parseFVS(span.style.fontVariationSettings);
  Object.assign(current, newAxes);
  span.style.fontVariationSettings = serializeFVS(current);
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

/**
 * Dynamically set the font-family on the stage element.
 *
 * @param {string} family — e.g. "Roboto Flex"
 */
export function setFontFamily(family) {
  stage.style.fontFamily = `'${family}', sans-serif`;
}

// ── helpers ──────────────────────────────────────────────────────────────

function parseFVS(fvs) {
  const result = {};
  if (!fvs) return result;
  const re = /"(\w+)"\s+([-\d.]+)/g;
  let m;
  while ((m = re.exec(fvs))) {
    result[m[1]] = parseFloat(m[2]);
  }
  return result;
}

function serializeFVS(axes) {
  return Object.entries(axes)
    .map(([tag, val]) => `"${tag}" ${val}`)
    .join(', ');
}
