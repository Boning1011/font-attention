/**
 * preview-engine.js — Isolated mini-animation loops for module preview windows
 *
 * Each module gets a preview controller that runs its own lightweight animation
 * loop inside a small container within the module card. Previews are independent
 * of the main token stage and renderer.
 */

import { getParam, isModuleEnabled } from './module-store.js';

const WORDS = ['The', ' quick', ' brown', ' fox'];
const SHORT_WORDS = ['A', ' B', ' C', ' D', ' E', ' F', ' G', ' H'];

// Active controllers keyed by module ID
const controllers = {};

// ── Public API ──────────────────────────────────────────────────────────

export function initPreviews() {
  const factories = {
    entrance: createEntrancePreview,
    sympatheticPops: createPopsPreview,
    oscillation: createOscillationPreview,
    disturbance: createDisturbancePreview,
    stability: createStabilityPreview,
    axisCurve: createAxisCurvePreview,
  };

  for (const [moduleId, factory] of Object.entries(factories)) {
    const container = document.querySelector(`.module-preview[data-preview="${moduleId}"]`);
    if (!container) continue;
    const ctrl = factory(container);
    controllers[moduleId] = ctrl;
    // Start only if module is enabled and card is not collapsed
    const card = container.closest('.module-card');
    const visible = !card.classList.contains('collapsed') && isModuleEnabled(moduleId);
    if (visible) ctrl.start();
  }
}

export function onModuleVisibilityChange(moduleId, visible) {
  const ctrl = controllers[moduleId];
  if (!ctrl) return;
  if (visible) ctrl.start(); else ctrl.stop();
}

export function stopAllPreviews() {
  for (const ctrl of Object.values(controllers)) ctrl.stop();
}

// ── Shared helpers ──────────────────────────────────────────────────────

function createTokens(container, words) {
  container.innerHTML = '';
  return words.map(w => {
    const span = document.createElement('span');
    span.className = 'preview-token';
    span.textContent = w;
    container.appendChild(span);
    return span;
  });
}

// ── Entrance preview ────────────────────────────────────────────────────

function createEntrancePreview(container) {
  const tokens = createTokens(container, WORDS);
  let timerId = null;
  let running = false;

  function runCycle() {
    if (!running) return;
    // Hide all
    tokens.forEach(t => {
      t.style.opacity = '0';
      t.className = 'preview-token';
    });

    // Stagger entrance
    tokens.forEach((t, i) => {
      setTimeout(() => {
        if (!running) return;
        t.className = 'preview-token token entering';
        requestAnimationFrame(() => {
          t.classList.remove('entering');
          t.classList.add('entered');
        });
      }, i * 200);
    });

    timerId = setTimeout(runCycle, 3000);
  }

  return {
    start() { if (running) return; running = true; runCycle(); },
    stop() { running = false; clearTimeout(timerId); },
  };
}

// ── Sympathetic Pops preview ────────────────────────────────────────────

function createPopsPreview(container) {
  const tokens = createTokens(container, WORDS.concat([' jumps']));
  // Show tokens as static entered state
  tokens.forEach(t => { t.className = 'preview-token token entered'; t.style.opacity = '1'; });
  let timerId = null;
  let running = false;

  function runCycle() {
    if (!running) return;
    const count = getParam('popCountMin') + Math.floor(Math.random() * (getParam('popCountMax') - getParam('popCountMin') + 1));
    const picks = Math.min(count, tokens.length);
    const indices = new Set();
    let attempts = 0;
    while (indices.size < picks && attempts < picks * 3) {
      indices.add(Math.floor(Math.random() * tokens.length));
      attempts++;
    }
    for (const idx of indices) {
      const t = tokens[idx];
      t.classList.remove('popping');
      void t.offsetWidth;
      t.classList.add('popping');
      t.addEventListener('animationend', () => t.classList.remove('popping'), { once: true });
    }
    timerId = setTimeout(runCycle, 1500);
  }

  return {
    start() { if (running) return; running = true; runCycle(); },
    stop() { running = false; clearTimeout(timerId); },
  };
}

// ── Oscillation preview ─────────────────────────────────────────────────

function createOscillationPreview(container) {
  const tokens = createTokens(container, WORDS);
  tokens.forEach(t => { t.style.opacity = '1'; });
  let timerId = null;
  let running = false;
  let tick = 0;

  function runStep() {
    if (!running) return;
    const ampBase = getParam('oscillationAmpBase');
    const ampDecay = getParam('oscillationAmpDecay');
    const steps = getParam('oscillationSteps');
    const stepInCycle = tick % (steps * 2);
    const sign = (stepInCycle % 2 === 0) ? 1 : -1;
    const amp = ampBase * Math.pow(ampDecay, stepInCycle % steps);

    tokens.forEach((t, i) => {
      const phase = tick * 0.4 + i * 1.1;
      const base = 400 + 200 * Math.sin(phase);
      const wght = Math.round(base + sign * amp * 80);
      t.style.fontVariationSettings = `"wght" ${Math.max(100, Math.min(900, wght))}`;
    });
    tick++;
    timerId = setTimeout(runStep, getParam('stepMs'));
  }

  return {
    start() { if (running) return; running = true; tick = 0; runStep(); },
    stop() { running = false; clearTimeout(timerId); },
  };
}

// ── Disturbance preview ─────────────────────────────────────────────────

function createDisturbancePreview(container) {
  const tokens = createTokens(container, SHORT_WORDS);
  tokens.forEach(t => { t.style.opacity = '1'; });
  let timerId = null;
  let running = false;
  let simIndex = 8; // simulate "newest token" position

  function runRound() {
    if (!running) return;
    const fraction = getParam('maxDisturbFraction');
    const window_ = getParam('nearbyWindow');
    const maxDisturb = Math.max(1, Math.floor(tokens.length * fraction));

    // Clear previous state
    tokens.forEach(t => t.classList.remove('pv-active'));

    // Pick disturbed tokens using simplified distance-based probability
    let count = 0;
    for (let j = 0; j < tokens.length && count < maxDisturb; j++) {
      const age = tokens.length - 1 - j;
      const isNearby = age <= window_;
      const prob = isNearby ? 0.7 - (age / window_) * 0.4 : 0.25 / (1 + (age - window_) * 0.15);
      if (Math.random() < prob) {
        tokens[j].classList.add('pv-active');
        count++;
      }
    }
    simIndex++;
    timerId = setTimeout(runRound, 800);
  }

  return {
    start() { if (running) return; running = true; simIndex = 8; runRound(); },
    stop() { running = false; clearTimeout(timerId); tokens.forEach(t => t.classList.remove('pv-active')); },
  };
}

// ── Stability preview ───────────────────────────────────────────────────

function createStabilityPreview(container) {
  const tokens = createTokens(container, SHORT_WORDS);
  tokens.forEach(t => { t.style.opacity = '1'; });
  let timerId = null;
  let running = false;
  const stability = new Array(tokens.length).fill(0);

  function runRound() {
    if (!running) return;
    const threshold = getParam('settleThreshold');
    const rippleChance = getParam('rippleChance');

    for (let j = 0; j < tokens.length; j++) {
      // Simulate: each round, some tokens get disturbed, others increment
      const disturbed = Math.random() < 0.2;
      if (disturbed) {
        stability[j] = 0;
      } else {
        stability[j]++;
      }

      const isSettled = stability[j] >= threshold;
      tokens[j].classList.toggle('pv-settled', isSettled);
      tokens[j].classList.remove('pv-ripple');

      // Ripple: settled token occasionally flashes
      if (isSettled && Math.random() < rippleChance) {
        tokens[j].classList.add('pv-ripple');
        tokens[j].classList.remove('pv-settled');
        stability[j] = 0;
      }
    }

    timerId = setTimeout(runRound, 600);
  }

  return {
    start() {
      if (running) return;
      running = true;
      stability.fill(0);
      tokens.forEach(t => { t.classList.remove('pv-settled', 'pv-ripple'); });
      runRound();
    },
    stop() { running = false; clearTimeout(timerId); },
  };
}

// ── Axis Curve preview ──────────────────────────────────────────────────

function createAxisCurvePreview(container) {
  const tokens = createTokens(container, WORDS);
  tokens.forEach(t => { t.style.opacity = '1'; });
  let timerId = null;
  let running = false;
  let tick = 0;

  function runStep() {
    if (!running) return;
    const biasExp = getParam('extremeBiasExponent');

    tokens.forEach((t, i) => {
      const phase = tick * 0.08 + i * 1.5;
      let sinVal = Math.sin(phase);
      // Apply extreme bias
      sinVal = Math.sign(sinVal) * Math.pow(Math.abs(sinVal), biasExp);
      const wght = Math.round(400 + 300 * sinVal);
      t.style.fontVariationSettings = `"wght" ${Math.max(100, Math.min(900, wght))}`;
    });
    tick++;
    timerId = setTimeout(runStep, 60);
  }

  return {
    start() { if (running) return; running = true; tick = 0; runStep(); },
    stop() { running = false; clearTimeout(timerId); },
  };
}
