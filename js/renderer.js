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
  applyAxes(span, axes);

  stage.appendChild(span);

  // Measure-then-lock: freeze the initial width so axis changes never reflow the paragraph
  // Use getBoundingClientRect for sub-pixel precision (offsetWidth rounds to integers)
  const naturalWidth = span.getBoundingClientRect().width;
  span.style.width = naturalWidth + 'px';

  // Typewriter pop: force layout with opacity 0, then snap to visible
  requestAnimationFrame(() => {
    span.classList.remove('entering');
    span.classList.add('entered');
  });

  tokenSpans.push(span);
  return tokenSpans.length - 1;
}

/**
 * Replay the pop animation (scale + blur) on an existing token.
 * Used to create sympathetic "pops" when a new token enters.
 *
 * @param {number} index
 */
export function popToken(index) {
  const span = tokenSpans[index];
  if (!span) return;

  // Remove entered, apply entering to trigger the scale+blur state
  span.classList.remove('entered');
  span.classList.add('entering');

  // After one frame (so the browser registers the entering state), snap back
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      span.classList.remove('entering');
      span.classList.add('entered');
    });
  });
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
  applyAxes(span, current);
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

// Axes that also need a dedicated CSS property in addition to font-variation-settings.
// For 'ital': Google Fonts serves italic as a separate font file selected via
// @font-face font-style descriptor, so we need font-style to pick the right file.
// We also keep "ital" in font-variation-settings because the spec says FVS resets
// unmentioned axes to defaults, which would override font-style back to normal.
const CSS_PROP_AXES = {
  ital: (span, val) => { span.style.fontStyle = val >= 1 ? 'italic' : 'normal'; },
};

function applyAxes(span, axes) {
  // Keep ALL axes in font-variation-settings (including ital).
  // Additionally apply CSS properties for axes that need them.
  for (const [tag, val] of Object.entries(axes)) {
    if (CSS_PROP_AXES[tag]) {
      CSS_PROP_AXES[tag](span, val);
    }
  }
  span.style.fontVariationSettings = serializeFVS(axes);
}

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
