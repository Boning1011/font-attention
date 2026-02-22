/**
 * font-registry.js — Font list
 *
 * Minimal registry: only family names. Axis metadata is fetched at runtime
 * from the Google Fonts Developer API (see font-api.js).
 *
 * To add a new font, just append a new entry.
 */

export const FONTS = [
  { id: 'roboto-flex', family: 'Roboto Flex' },
  { id: 'roboto', family: 'Roboto' },
  { id: 'open-sans', family: 'Open Sans' },
  { id: 'noto-sans', family: 'Noto Sans' },
  { id: 'noto-serif', family: 'Noto Serif' },
  { id: 'playfair-display', family: 'Playfair Display' },
  { id: 'merriweather', family: 'Merriweather' },
];
