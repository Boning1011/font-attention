/**
 * effects-panel.js — Modular animation editor UI
 *
 * Renders a left-side panel with collapsible cards for each animation module.
 * Each card has an enable/disable toggle and parameter sliders.
 * Slider changes update module-store in real time (no stream restart needed).
 */

import {
  MODULES,
  getParam,
  setParam,
  isModuleEnabled,
  setModuleEnabled,
  isCSSParam,
  injectModuleCSS,
} from './module-store.js';

/**
 * Build and mount the effects panel. Call once on page load.
 */
export function initEffectsPanel() {
  const panel = document.createElement('div');
  panel.id = 'effects-panel';

  let html = '<h3 class="effects-title">Effects</h3>';

  for (const mod of MODULES) {
    const enabled = isModuleEnabled(mod.id);
    const disabledClass = enabled ? '' : ' disabled';

    html += `<div class="module-card${disabledClass}" data-module="${mod.id}">`;
    html += `  <div class="module-header">`;
    html += `    <span class="module-label"><span class="module-chevron">▼</span> ${mod.label}</span>`;
    html += `    <input type="checkbox" class="module-toggle" data-module-id="${mod.id}" ${enabled ? 'checked' : ''}>`;
    html += `  </div>`;
    html += `  <div class="module-body">`;

    for (const p of mod.params) {
      const val = getParam(p.key);
      html += `<div class="param-row">`;
      html += `  <div class="param-header">`;
      html += `    <span class="param-label">${p.label}</span>`;
      html += `    <span class="param-value" id="pv-${p.key}">${formatValue(val, p.step)}</span>`;
      html += `  </div>`;
      html += `  <input type="range" class="param-slider" data-key="${p.key}"`;
      html += `    min="${p.min}" max="${p.max}" step="${p.step}" value="${val}">`;
      html += `</div>`;
    }

    html += `  </div>`;
    html += `</div>`;
  }

  panel.innerHTML = html;
  document.body.appendChild(panel);

  // Wire events
  wireToggleEvents(panel);
  wireSliderEvents(panel);
  wireCollapseEvents(panel);
}

// ── event wiring ────────────────────────────────────────────────────────

function wireToggleEvents(panel) {
  panel.querySelectorAll('.module-toggle').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation(); // Don't trigger collapse
      const moduleId = checkbox.dataset.moduleId;
      const enabled = checkbox.checked;
      setModuleEnabled(moduleId, enabled);

      const card = panel.querySelector(`.module-card[data-module="${moduleId}"]`);
      if (card) {
        card.classList.toggle('disabled', !enabled);
      }
    });
  });
}

function wireSliderEvents(panel) {
  panel.querySelectorAll('.param-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      const key = slider.dataset.key;
      const value = parseFloat(slider.value);
      setParam(key, value);

      // Update readout
      const paramDef = findParamDef(key);
      const readout = document.getElementById(`pv-${key}`);
      if (readout && paramDef) {
        readout.textContent = formatValue(value, paramDef.step);
      }

      // Regenerate CSS if this is a CSS-affecting parameter
      if (isCSSParam(key)) {
        injectModuleCSS();
      }
    });
  });
}

function wireCollapseEvents(panel) {
  panel.querySelectorAll('.module-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Don't collapse when clicking the toggle checkbox
      if (e.target.classList.contains('module-toggle')) return;

      const card = header.closest('.module-card');
      card.classList.toggle('collapsed');
    });
  });
}

// ── helpers ─────────────────────────────────────────────────────────────

function findParamDef(key) {
  for (const mod of MODULES) {
    for (const p of mod.params) {
      if (p.key === key) return p;
    }
  }
  return null;
}

function formatValue(val, step) {
  if (step >= 1) return String(Math.round(val));
  const decimals = countDecimals(step);
  return val.toFixed(decimals);
}

function countDecimals(num) {
  const str = String(num);
  const dot = str.indexOf('.');
  return dot === -1 ? 0 : str.length - dot - 1;
}
