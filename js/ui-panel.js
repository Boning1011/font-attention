/**
 * ui-panel.js — Configuration panel
 *
 * Fixed right-side panel with:
 *   - API Key input (persisted in localStorage)
 *   - Font family selector
 *   - Per-axis dual-range sliders (min/max)
 *
 * Dispatches 'fontconfig:change' on document whenever config changes.
 */

import { FONTS } from './font-registry.js';
import { fetchFontAxes, clearCache } from './font-api.js';

const LS_KEY_API = 'gf-api-key';
const LS_KEY_FONT = 'gf-selected-font';

let activeFont = null;
let axesMetadata = [];          // [{ tag, start, end }] from API
let axisRanges = {};            // { [tag]: { min, max } } user-set active ranges

// ── public API ───────────────────────────────────────────────────────────

/**
 * Build and mount the config panel. Call once on page load.
 */
export function initPanel() {
  const panel = document.createElement('div');
  panel.id = 'config-panel';
  panel.innerHTML = `
    <h3 class="panel-title">Font Config</h3>

    <label class="panel-label" for="api-key-input">API Key</label>
    <input id="api-key-input" class="panel-input" type="password"
           placeholder="Google Fonts API Key"
           value="${localStorage.getItem(LS_KEY_API) || ''}">

    <label class="panel-label" for="font-select">Font Family</label>
    <select id="font-select" class="panel-select">
      ${FONTS.map(f => `<option value="${f.id}">${f.family}</option>`).join('')}
    </select>

    <div id="axes-container"></div>
    <div id="axes-status" class="panel-status"></div>
  `;
  document.body.appendChild(panel);

  // Restore saved font selection
  const savedFontId = localStorage.getItem(LS_KEY_FONT);
  const select = document.getElementById('font-select');
  if (savedFontId && FONTS.some(f => f.id === savedFontId)) {
    select.value = savedFontId;
  }

  // Wire events
  document.getElementById('api-key-input').addEventListener('change', onApiKeyChange);
  select.addEventListener('change', onFontChange);

  // Initial load
  activeFont = FONTS.find(f => f.id === select.value) || FONTS[0];
  loadAxesForCurrentFont();
}

/**
 * Get the current configuration for the driver.
 *
 * @returns {{ font: { id: string, family: string }, axes: Array, activeAxes: Record<string, {min: number, max: number}> } | null}
 */
export function getActiveConfig() {
  if (!activeFont || axesMetadata.length === 0) return null;
  return {
    font: activeFont,
    axes: axesMetadata,
    activeAxes: { ...axisRanges },
  };
}

// ── event handlers ───────────────────────────────────────────────────────

function onApiKeyChange(e) {
  const key = e.target.value.trim();
  localStorage.setItem(LS_KEY_API, key);
  clearCache();
  loadAxesForCurrentFont();
}

function onFontChange(e) {
  const fontId = e.target.value;
  activeFont = FONTS.find(f => f.id === fontId) || FONTS[0];
  localStorage.setItem(LS_KEY_FONT, fontId);
  loadAxesForCurrentFont();
}

// ── axes loading & rendering ─────────────────────────────────────────────

async function loadAxesForCurrentFont() {
  const apiKey = localStorage.getItem(LS_KEY_API);
  const status = document.getElementById('axes-status');
  const container = document.getElementById('axes-container');

  if (!apiKey) {
    container.innerHTML = '';
    status.textContent = 'Enter an API Key above.';
    axesMetadata = [];
    axisRanges = {};
    return;
  }

  status.textContent = 'Loading axes…';
  container.innerHTML = '';

  try {
    axesMetadata = await fetchFontAxes(activeFont.family, apiKey);
    axisRanges = {};
    axesMetadata.forEach(a => {
      axisRanges[a.tag] = { min: a.start, max: a.end };
    });

    renderAxisControls();
    status.textContent = '';
    fireChange();
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
    axesMetadata = [];
    axisRanges = {};
  }
}

function renderAxisControls() {
  const container = document.getElementById('axes-container');
  container.innerHTML = '';

  axesMetadata.forEach(axis => {
    const { tag, start, end } = axis;
    const range = axisRanges[tag];
    const step = Number.isInteger(start) && Number.isInteger(end) ? 1 : 0.1;

    const group = document.createElement('div');
    group.className = 'axis-control';
    group.innerHTML = `
      <div class="axis-header">
        <span class="axis-tag">${tag}</span>
        <span class="axis-readout" id="readout-${tag}">${range.min} … ${range.max}</span>
      </div>
      <div class="range-stack">
        <input type="range" class="range-lower" data-tag="${tag}"
               min="${start}" max="${end}" step="${step}" value="${range.min}">
        <input type="range" class="range-upper" data-tag="${tag}"
               min="${start}" max="${end}" step="${step}" value="${range.max}">
      </div>
    `;
    container.appendChild(group);

    const lower = group.querySelector('.range-lower');
    const upper = group.querySelector('.range-upper');

    lower.addEventListener('input', () => {
      if (parseFloat(lower.value) > parseFloat(upper.value)) {
        lower.value = upper.value;
      }
      axisRanges[tag].min = parseFloat(lower.value);
      updateReadout(tag);
      fireChange();
    });

    upper.addEventListener('input', () => {
      if (parseFloat(upper.value) < parseFloat(lower.value)) {
        upper.value = lower.value;
      }
      axisRanges[tag].max = parseFloat(upper.value);
      updateReadout(tag);
      fireChange();
    });
  });
}

function updateReadout(tag) {
  const el = document.getElementById(`readout-${tag}`);
  if (el) el.textContent = `${axisRanges[tag].min} … ${axisRanges[tag].max}`;
}

function fireChange() {
  document.dispatchEvent(new CustomEvent('fontconfig:change'));
}
