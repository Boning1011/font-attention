"""Export a small, browser-ready replay from real Qwen3 attention tensors."""

import argparse
import json
import math
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


DEFAULT_TEXT = """Shall I compare thee to a summer's day?
Thou art more lovely and more temperate.
Rough winds do shake the darling buds of May,
And summer's lease hath all too short a date."""


def remap(value: float, low: float, high: float) -> float:
    return low + max(0.0, min(1.0, value)) * (high - low)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Qwen/Qwen3-0.6B")
    parser.add_argument("--text", default=DEFAULT_TEXT)
    parser.add_argument("--output", default="public/data/qwen3-sonnet-18.json")
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.bfloat16 if device == "cuda" else torch.float32
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        dtype=dtype,
        attn_implementation="eager",
    ).to(device).eval()

    encoded = tokenizer(args.text, return_tensors="pt", add_special_tokens=False)
    input_ids = encoded.input_ids.to(device)
    with torch.inference_mode():
        output = model(input_ids=input_ids, output_attentions=True, use_cache=False)

    layers = [layer.float().cpu() for layer in output.attentions[-4:]]
    attention = torch.stack(layers).mean(dim=(0, 2))[0]  # sequence x sequence
    token_ids = input_ids[0].cpu().tolist()
    tokens = [tokenizer.decode([token_id], clean_up_tokenization_spaces=False) for token_id in token_ids]
    frames = []

    for index in range(len(tokens)):
        causal = attention[index, : index + 1].clamp_min(0)
        causal = causal / causal.sum().clamp_min(1e-9)
        entropy = float(-(causal * causal.clamp_min(1e-9).log()).sum())
        entropy_norm = entropy / math.log(max(2, index + 1))
        self_weight = float(causal[-1])
        focus = float(causal.max())

        previous = causal[:-1]
        links = []
        if previous.numel():
            count = min(3, previous.numel())
            values, indices = torch.topk(previous, count)
            selected_sum = float(values.sum()) or 1.0
            links = [
                {"index": int(link_index), "weight": round(float(value) / selected_sum, 4)}
                for value, link_index in zip(values, indices)
            ]

        frames.append({
            "axes": {
                "wght": round(remap(focus, 180, 600)),
                "wdth": round(remap(entropy_norm, 72, 138)),
                "slnt": round(remap(self_weight, 0, -9), 1),
                "opsz": round(remap(1 - entropy_norm, 28, 112)),
            },
            "metrics": {
                "focus": round(focus, 4),
                "entropy": round(entropy_norm, 4),
                "selfAttention": round(self_weight, 4),
            },
            "links": links,
        })

    payload = {
        "meta": {
            "model": args.model,
            "source": "REAL ATTENTION TENSORS",
            "text": args.text,
            "method": "Teacher-forced Qwen3 replay. Attention is averaged across all heads in the final four layers, then mapped to weight, width, slant and optical-size axes.",
            "layersAveraged": 4,
        },
        "tokens": tokens,
        "frames": frames,
    }
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(tokens)} tokens from {args.model} to {output_path}")


if __name__ == "__main__":
    main()
