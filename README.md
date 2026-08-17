# Font Attention

Font Attention is a design-engineering experiment that translates transformer attention into typography. A recorded pass from **Qwen3-0.6B** drives typographic weight, slant, spacing, motion, and a mixed case of three typewriter faces—Courier Prime, Special Elite, and Cutive Mono—while exposing the strongest token-to-token links.

**[Open the live interactive replay](https://boning1011.github.io/font-attention/)**

The current demo uses all fourteen lines of Shakespeare's *Sonnet 18*: 148 recorded model tokens displayed through a gently moving seven-line window. The Letter surface contains only the poem and its attention annotations; playback, model metadata, source links, and mapping controls live in a separate dock below the paper. It is a teacher-forced replay of real attention tensors—not a simulation and not a claim that the model authored the text.

![Font Attention interface replay](media/font-attention-demo.gif)

## What it explores

- **LLM interpretability as visual material** — model attention becomes legible motion, emphasis, and connection.
- **Variable typography as a data display** — four font axes respond to focus, entropy, and self-attention.
- **Motion as contextual disturbance** — each incoming token and selected context words shift by roughly a pixel and a fraction of a degree in place. There is no scale pop or blur; older words settle until an attention-linked ripple reaches them.
- **Design engineering in the browser** — the visualization, transport controls, and inspector are implemented as a lightweight static web app.
- **One replay, three typewriter faces** — the default case mixes Courier Prime, Special Elite, and Cutive Mono token by token, while the selector can isolate any one face. A true Courier Prime italic, synthetic italics for the single-style faces, small caps, and italic small caps introduce restrained token-level variants.
- **Restrained controls** — the portrait sheet keeps only the typewriter selector and mapping preset at its foot; the default state is Typewriter Mixed Case with Balanced mapping.
- **Parameterized ink annotations** — attention links are assembled from pressure-varying line segments, dry-brush gaps, flecks, and deterministic displacement rather than Bézier curves. They stay nearly straight, with distance-scaled drift so short links read as quiet connecting strokes instead of angular hooks. The current token receives a loose, single-stroke open circle. The strongest attention link is marked in broken red ballpoint ink; other links rotate through hand-drawn circles, underlines, dense strikeouts, and no mark.
- **Time-lapse revision rhythm** — circles and strikeouts hold for three token steps before the annotation layer changes, avoiding rapid flashes while preserving the sense of a manuscript being revised by hand. Dense strikeouts land as stable, opaque black ink rather than fading strokes.
- **Margin notes as data display** — each incoming token connects directly back to its five strongest source words, preserving the direction of contextual attention. A loose, unboxed handwritten list at the page edge repeats those words independently; broad, jittered marker strokes replace numeric percentages as the weight display.
- **Typographic memory** — a restrained, deterministic imprint pattern lets selected tokens retain different weights, widths, slants, ink densities, and sub-pixel registration after motion settles; quieter tokens preserve the rhythm of a typed page.
- **Reproducible model-to-interface pipeline** — a Python exporter converts local model tensors into compact JSON; the deployed site needs no model server or API key.

## Run the interface

```bash
npm install
npm run dev
```

Create a production build with `npm run build`. The repository includes a GitHub Pages workflow, and the site has no runtime secrets or backend dependency.

## Regenerate the attention replay

Create a Python environment with PyTorch and Transformers, then run:

```bash
python -m pip install -r requirements-model.txt
python scripts/export_attention_replay.py
```

The exporter defaults to `Qwen/Qwen3-0.6B`, runs on CUDA when available, averages every head in the final four transformer layers, and writes `public/data/qwen3-sonnet-18.json`. It retains the six strongest prior-token links with their raw attention weights; the browser compresses only their visual contrast so weaker links stay legible. A different model or text can be supplied with `--model` and `--text`.

## Mapping

| Attention signal | Typographic axis |
| --- | --- |
| Maximum attention / focus | Weight (`wght`) |
| Normalized attention entropy | Width (`wdth`) |
| Self-attention | Slant (`slnt`) |
| Inverse entropy | Optical size (`opsz`) |

This mapping is an expressive design decision, not an analytical claim about model cognition.

The motion layer preserves selective disturbance, decaying axis oscillation, stability, and occasional ripples from the early prototype while replacing pop-and-blur movement with tiny local translations and rotations. The four source lines form a compact, left-aligned quatrain set slightly left of center on a portrait 8.5 × 11 sheet, with broad paper margins around it. Unprinted tokens remain blank. When the final token arrives, links, margin notes, circles, and strikeouts clear away and the clean typeset page holds for 3.2 seconds before the next replay.

## Stack

Qwen3 · PyTorch · Hugging Face Transformers · JavaScript · SVG · CSS typography · Vite

## License

Source code is available under the MIT License. Shakespeare's *Sonnet 18* is in the public domain.
