/**
 * font-api.js — Google Fonts Developer API client
 *
 * Fetches variable-font axis metadata at runtime.
 * Results are cached in memory so each font is fetched only once per session.
 */

const API_BASE = 'https://www.googleapis.com/webfonts/v1/webfonts';
const cache = new Map();

/**
 * Fetch axis metadata for a Google Fonts variable font.
 *
 * @param {string} family  — e.g. "Roboto Flex"
 * @param {string} apiKey  — Google Fonts API key
 * @returns {Promise<Array<{ tag: string, start: number, end: number }>>}
 */
export async function fetchFontAxes(family, apiKey) {
  if (cache.has(family)) return cache.get(family);

  const url = `${API_BASE}?family=${encodeURIComponent(family)}&capability=VF&key=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Google Fonts API error ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const item = data.items?.[0];

  if (!item || !item.axes || item.axes.length === 0) {
    throw new Error(`"${family}" has no variable axes or was not found.`);
  }

  const axes = item.axes.map(a => ({
    tag: a.tag,
    start: a.start,
    end: a.end,
  }));

  cache.set(family, axes);
  return axes;
}

/**
 * Clear the in-memory cache (useful if the user changes API key).
 */
export function clearCache() {
  cache.clear();
}
