# Project Direction — Font × Attention

> Early-stage vision document. Many things are intentionally left open.

## What Is This

A real-time web visualization that fuses **font embeddings** with **LLM attention mechanisms**. As a language model generates tokens, each token's typographic appearance — weight, width, slant, optical size, and other stylistic axes — is driven by the model's internal attention patterns in that moment.

The result is a living, breathing piece of text where fonts shift and morph as meaning unfolds.

## Core Idea

Fonts carry meaning. A typeface is not a neutral vessel — it has personality, temperature, tension. This project treats fonts as a **first-class semantic layer**, not decoration.

The key insight: if text tokens live in embedding space, fonts can too. And if attention weights describe relationships between tokens, those same weights can describe relationships between tokens and their visual form.

**Token → Attention → Font Parameters → Rendered Glyph** — this is the pipeline.

### Semantic Mapping

Beyond pure attention-driven dynamics, there's a natural semantic dimension: the *meaning* of a token can correspond to a *style* of font. "Modern" gravitates toward geometric sans-serifs; "ancient" pulls toward blackletter or serif; "whisper" thins out, "scream" gets heavier. This mapping could be hand-tuned initially, or learned through multimodal models.

The two layers — attention-driven dynamics and semantic mapping — can coexist and blend.

### Aesthetic Direction

The target aesthetic sits in a specific tension: **high-tech elegance meets the rough, tactile quality of letterpress or poorly-inked printing**. Think digital precision with analog soul. Glyphs that feel slightly alive, slightly imperfect, as if the machine is breathing through the text.

This is not a clean data-visualization. It's closer to a generative art piece that happens to be legible.

## Why Variable Fonts

Early exploration led to a decisive architectural choice: **variable fonts over discrete font switching**.

A variable font exposes continuous axes — `wght`, `wdth`, `ital`, `opsz`, and often custom ones like `CASL` (casualness), `MONO` (monospace amount), `SOFT` (softness), `WONK` (wonkiness). These axes map naturally to continuous attention weight values. No jarring jumps between font families — just smooth interpolation through a typographic space.

This makes the system feel organic rather than mechanical.

### Notable Variable Fonts (for reference)

Some variable fonts with rich axis sets that are particularly interesting for this project:

- **Roboto Flex** — 12 axes, extremely wide range of expression in a single family
- **Recursive** — `CASL` (casual ↔ linear) and `MONO` (proportional ↔ monospace) axes allow semantic transitions between formal/informal, prose/code
- **Fraunces** — `SOFT` and `WONK` axes give access to playful, organic deformation

These are not final choices. They represent the *kind* of typographic richness the system needs.

## Font Source: Google Fonts

After researching various options (Adobe Fonts, Fontsource, Font Squirrel, etc.), **Google Fonts** is the primary font source for the current phase:

- ~525 variable font families available
- Free, open-source, no API key friction
- CSS API v2 supports fine-grained axis range requests
- Developer API provides metadata including axis definitions and semantic tags (`FAMILY_TAGS`)
- Well-suited for web-based real-time rendering

Fontsource remains a possible complement for self-hosting needs.

### Phased Font Strategy (loose)

1. **Now** — A curated handful of variable fonts with diverse axes for prototyping
2. **Later** — Broader font set with semantic metadata (potentially using the O'Donovan perceptual attribute dataset for style mapping)
3. **Maybe** — FontCLIP or similar multimodal models for natural-language font queries ("find me something that feels like cold rain")

## Existing Foundation

A working pipeline for real-time attention extraction already exists from a separate project, built on **Hugging Face Transformers** and open-source models (primarily **Qwen 2.5**). This includes:

- Real-time inference with attention weight extraction
- Tokenizer integration and token-level data access
- Embedding dimensionality reduction (basic working version)

These components will be ported into this project as-is. They are not the focus here.

### What This Project Focuses On

Given the above, the core work in *this* repo is downstream of attention extraction:

- **Font parameter mapping** — how attention vectors translate into variable font axis values
- **Semantic font selection** — how token meaning influences which font / axis range to use
- **Web rendering & interaction** — real-time browser-based typographic output, smooth transitions, user-facing experience

The model inference side is a solved (enough) input. This project is about what happens *after* the attention data comes out.

## Development Approach

Lightweight, modular, fast iteration. Each piece should be independently testable:

- Small, decoupled modules over monolithic architecture
- MVP-first — get something rendering in the browser quickly, refine from there
- Swap-friendly interfaces (e.g. attention source could be live model or pre-recorded data — shouldn't matter to the rendering layer)

The goal is rapid prototyping cycles, not premature architecture.

## Open Questions

These are intentionally unresolved:

- **Attention layer selection** — Which layer(s) and head(s) of the transformer best drive visual output? Early layers capture syntax, later layers capture semantics. The extraction infrastructure exists; the *selection and mapping* needs experimentation.
- **Dimensionality mapping** — Attention weight vectors are high-dimensional; font axes are low-dimensional (~2–12). Basic embedding reduction experience exists from previous work, but the attention-to-font-axis mapping strategy is TBD. Could be learned, hand-designed, or PCA-based.
- **Temporal dynamics** — As new tokens generate, previous tokens' fonts shift retroactively (because attention redistributes). How to handle this transition — instant snap, smooth lerp, physics-based easing — is an aesthetic choice not yet made.
- **Interaction direction** — The current concept is one-way (model → font). A bidirectional version where font choices feed back into generation is conceptually interesting but significantly more complex.
- **Deployment context** — Could be a standalone web piece, could be an art installation (lobby / gallery), could be an interactive tool. The core engine should be context-agnostic.

## Background

This project comes from a background in lobby-scale installations and motion design, combined with hands-on experience building LLM inference pipelines with Hugging Face Transformers. The motivation is not to "visualize AI" as a dashboard or explainability tool — it's to create a new kind of typographic experience where computation and visual culture merge at the level of the individual glyph.

---

*This document describes intent and direction, not specification. Implementation details and technical architecture will evolve as prototyping progresses.*
