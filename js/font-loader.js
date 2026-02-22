/**
 * font-loader.js — Dynamic Google Fonts loader
 *
 * Builds a CSS API v2 URL from font family + axes data, swaps the
 * stylesheet <link>, and returns a Promise that resolves when the font
 * is ready to render.
 */

const LOAD_TIMEOUT_MS = 8000;

/**
 * Build a Google Fonts CSS v2 URL for a variable font.
 *
 * Axis tags are sorted per Google Fonts requirement:
 *   uppercase tags first (alphabetically), then lowercase (alphabetically).
 *
 * @param {string} family — e.g. "Roboto Flex"
 * @param {Array<{ tag: string, start: number, end: number }>} axes
 * @returns {string} Full URL
 */
export function buildGoogleFontsUrl(family, axes) {
  const sorted = [...axes].sort((a, b) => {
    const aUp = a.tag[0] === a.tag[0].toUpperCase();
    const bUp = b.tag[0] === b.tag[0].toUpperCase();
    if (aUp !== bUp) return aUp ? -1 : 1;
    return a.tag.localeCompare(b.tag);
  });

  const tags = sorted.map(a => a.tag).join(',');
  const ranges = sorted.map(a => `${a.start}..${a.end}`).join(',');
  const encoded = family.replace(/ /g, '+');

  return `https://fonts.googleapis.com/css2?family=${encoded}:${tags}@${ranges}&display=swap`;
}

/**
 * Load a Google variable font by swapping the stylesheet link.
 *
 * @param {string} family
 * @param {Array<{ tag: string, start: number, end: number }>} axes
 * @returns {Promise<void>} Resolves when the stylesheet is loaded.
 */
export function loadFont(family, axes) {
  const url = buildGoogleFontsUrl(family, axes);
  const link = document.getElementById('gf-stylesheet');

  // If the link already points to this URL, resolve immediately
  if (link.href === url) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Font "${family}" load timed out after ${LOAD_TIMEOUT_MS}ms`));
    }, LOAD_TIMEOUT_MS);

    link.addEventListener('load', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });

    link.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error(`Failed to load font "${family}"`));
    }, { once: true });

    link.href = url;
  });
}
