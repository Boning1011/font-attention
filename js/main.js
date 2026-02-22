/**
 * main.js — Entry point
 *
 * Wires up the mock driver with sample text.
 * Replace this file (or import a different driver) to switch data sources.
 */

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

streamTokens(tokens, 100);
