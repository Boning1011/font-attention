/**
 * main.js — Coordinator
 *
 * Wires the UI panel, font loader, renderer, and mock driver together.
 * Listens for config changes and restarts the stream accordingly.
 */

import { initPanel, getActiveConfig } from './ui-panel.js';
import { loadFont } from './font-loader.js';
import { clearStage, setFontFamily } from './renderer.js';
import { streamTokens } from './mock-driver.js';

const MOCK_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, ' +
  'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris ' +
  'nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in ' +
  'reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla ' +
  'pariatur. Excepteur sint occaecat cupidatat non proident, sunt in ' +
  'culpa qui officia deserunt mollit anim id est laborum.';

const tokens = MOCK_TEXT.match(/\S+\s*/g) || [];

let currentStream = null;
let generation = 0;

async function start() {
  const gen = ++generation;

  if (currentStream) {
    currentStream.stop();
    currentStream = null;
  }
  clearStage();

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

  currentStream = streamTokens(tokens, config, 100);
}

document.addEventListener('fontconfig:change', () => start());

initPanel();
start();
