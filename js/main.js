/**
 * main.js — Coordinator
 *
 * Wires the UI panel, font loader, renderer, tokenizer, and mock driver together.
 * Listens for config changes and restarts the stream accordingly.
 */

import { initPanel, getActiveConfig, getSelectedText } from './ui-panel.js';
import { initEffectsPanel } from './effects-panel.js';
import { loadFont } from './font-loader.js';
import { clearStage, setFontFamily } from './renderer.js';
import { streamTokens } from './mock-driver.js';
import { initTokenizer, tokenize } from './tokenizer.js';
import { initAttentionLines, clearLines } from './attention-lines.js';

let currentStream = null;
let generation = 0;
let tokenizerReady = false;

async function start() {
  const gen = ++generation;

  if (currentStream) {
    currentStream.stop();
    currentStream = null;
  }
  clearStage();
  clearLines();

  if (!tokenizerReady) return;

  const config = getActiveConfig();
  if (!config) return; // no API key or axes not loaded yet

  setFontFamily(config.font.family);

  try {
    await loadFont(config.font.family, config.axes);
  } catch (err) {
    console.warn('Font load failed:', err.message);
    return;
  }

  // Guard against stale start if a newer config change fired while we waited
  if (gen !== generation) return;

  // BPE tokenization
  const tokens = tokenize(getSelectedText()).map(t => t.text);

  currentStream = streamTokens(tokens, config, 100);
}

function showStatus(msg) {
  const stage = document.getElementById('token-stage');
  if (msg) {
    stage.textContent = msg;
  } else {
    stage.textContent = '';
  }
}

async function init() {
  initPanel();
  initEffectsPanel();
  initAttentionLines();

  try {
    await initTokenizer('gpt2', showStatus);
    tokenizerReady = true;
  } catch (err) {
    showStatus(`Tokenizer failed to load: ${err.message}`);
    return;
  }

  start();
}

document.addEventListener('fontconfig:change', () => start());
init();
