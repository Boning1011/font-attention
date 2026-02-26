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
    attentionLines: createAttentionLinesPreview,
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
    // Hide all — use the CSS class, not inline style (inline would override entered opacity)
    tokens.forEach(t => {
      t.className = 'preview-token token entering';
    });

    // Stagger entrance
    tokens.forEach((t, i) => {
      setTimeout(() => {
        if (!running) return;
        // Force reflow so the browser registers the 'entering' state before transitioning
        t.className = 'preview-token token entering';
        void t.offsetWidth;
        t.classList.remove('entering');
        t.classList.add('entered');
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

// ── Attention Lines preview ──────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';

function createAttentionLinesPreview(container) {
  const tokens = createTokens(container, SHORT_WORDS);
  tokens.forEach(t => { t.style.opacity = '1'; });

  // Wrap tokens in a positioned div so SVG can overlay
  const svgWrap = document.createElement('div');
  svgWrap.style.position = 'relative';
  container.innerHTML = '';
  container.appendChild(svgWrap);
  tokens.forEach(t => svgWrap.appendChild(t));

  const pvSvg = document.createElementNS(SVG_NS, 'svg');
  pvSvg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;';
  svgWrap.appendChild(pvSvg);

  let timerId = null;
  let running = false;

  function runCycle() {
    if (!running) return;

    const opacity = getParam('alOpacity');
    const strokeWidth = getParam('alStrokeWidth');
    const fadeIn = getParam('alFadeIn');
    const holdTime = getParam('alHoldTime');
    const fadeOut = getParam('alFadeOut');

    // Pick a random pair
    const a = Math.floor(Math.random() * tokens.length);
    let b = Math.floor(Math.random() * tokens.length);
    if (b === a) b = (a + 1) % tokens.length;

    const wrapRect = svgWrap.getBoundingClientRect();
    const rA = tokens[a].getBoundingClientRect();
    const rB = tokens[b].getBoundingClientRect();

    const x1 = rA.left + rA.width / 2 - wrapRect.left;
    const y1 = rA.top + rA.height / 2 - wrapRect.top;
    const x2 = rB.left + rB.width / 2 - wrapRect.left;
    const y2 = rB.top + rB.height / 2 - wrapRect.top;

    const midX = (x1 + x2) / 2;
    const arcH = Math.min(Math.abs(x2 - x1) * 0.4, 12);
    const midY = Math.min(y1, y2) - arcH;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#888');
    path.setAttribute('stroke-width', strokeWidth);
    path.style.opacity = '0';
    path.style.transition = `opacity ${fadeIn}ms ease`;
    pvSvg.appendChild(path);

    requestAnimationFrame(() => { path.style.opacity = String(opacity); });

    setTimeout(() => {
      path.style.transition = `opacity ${fadeOut}ms ease`;
      path.style.opacity = '0';
    }, fadeIn + holdTime);

    setTimeout(() => { path.remove(); }, fadeIn + holdTime + fadeOut + 50);

    timerId = setTimeout(runCycle, 600);
  }

  return {
    start() { if (running) return; running = true; runCycle(); },
    stop() { running = false; clearTimeout(timerId); pvSvg.innerHTML = ''; },
  };
}
