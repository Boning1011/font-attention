/**
 * tokenizer.js — BPE tokenizer abstraction layer
 *
 * Wraps @huggingface/transformers AutoTokenizer behind a swappable interface.
 * Supports any HuggingFace model tokenizer (GPT-2, Qwen 2.5, etc.).
 *
 * Uses cumulative decode strategy to extract per-token display text:
 *   decode(ids[0..i]) − decode(ids[0..i−1]) = exact text for token i
 * This works correctly across all BPE variants (byte-level, sentencepiece, etc.).
 */

import { AutoTokenizer } from '@huggingface/transformers';

// ── model registry ──────────────────────────────────────────────────────

const MODEL_REGISTRY = {
  'gpt2':    { id: 'Xenova/gpt2',          label: 'GPT-2' },
  'qwen2.5': { id: 'Qwen/Qwen2.5-0.5B',   label: 'Qwen 2.5' },
};

const DEFAULT_MODEL = 'gpt2';

let _tokenizer = null;
let _currentModelKey = null;

// ── public API ──────────────────────────────────────────────────────────

/**
 * Initialize (or switch) the tokenizer. Downloads model files on first call.
 * Subsequent calls with the same modelKey are no-ops.
 *
 * @param {string} modelKey — key in MODEL_REGISTRY
 * @param {(status: string) => void} onProgress — called with loading status
 */
export async function initTokenizer(modelKey = DEFAULT_MODEL, onProgress = () => {}) {
  if (_tokenizer && _currentModelKey === modelKey) return;

  const entry = MODEL_REGISTRY[modelKey];
  if (!entry) throw new Error(`Unknown model: ${modelKey}`);

  onProgress(`Loading tokenizer: ${entry.label}…`);

  _tokenizer = await AutoTokenizer.from_pretrained(entry.id, {
    progress_callback: (info) => {
      if (info.status === 'progress' && info.total) {
        const pct = Math.round((info.loaded / info.total) * 100);
        onProgress(`Downloading ${entry.label} tokenizer… ${pct}%`);
      }
    },
  });

  _currentModelKey = modelKey;
  onProgress('');
}

/**
 * Tokenize text into display-ready segments.
 *
 * @param {string} text
 * @returns {{ text: string, id: number }[]}
 */
export function tokenize(text) {
  if (!_tokenizer) throw new Error('Tokenizer not initialized');

  const ids = _tokenizer.encode(text, { add_special_tokens: false });

  // Cumulative decode: each token's display text = decode(ids[0..i]) − decode(ids[0..i−1])
  const tokens = [];
  let prevDecoded = '';

  for (let i = 0; i < ids.length; i++) {
    const slice = ids.slice(0, i + 1);
    const decoded = _tokenizer.decode(slice, {
      skip_special_tokens: true,
      clean_up_tokenization_spaces: false,
    });
    const tokenText = decoded.slice(prevDecoded.length);
    prevDecoded = decoded;

    if (tokenText.length > 0) {
      tokens.push({ text: tokenText, id: ids[i] });
    }
  }

  return tokens;
}

/**
 * Available model keys for future UI selector.
 * @returns {{ key: string, label: string }[]}
 */
export function getAvailableModels() {
  return Object.entries(MODEL_REGISTRY).map(([key, v]) => ({ key, label: v.label }));
}

/** @returns {string|null} */
export function getCurrentModel() {
  return _currentModelKey;
}
