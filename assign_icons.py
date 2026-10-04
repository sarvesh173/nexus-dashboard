#!/usr/bin/env python3
"""Assign icons to models by reading the model name itself.

No hardcoded list per model. Rules run longest-match-first, so
"glm-4.5-air" hits `glm` before the generic fallback ever sees it.

Writes a single manifest the dashboard can consume:
    public/model-icons/manifest.json  ->  { "<model-id>": "/model-icons/<icon>.svg" }

Both public/ and dist/ get the manifest so a vite build never loses it.
"""

import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
ICON_DIRS = [os.path.join(ROOT, "public", "model-icons"),
             os.path.join(ROOT, "dist", "model-icons")]
CACHE = os.path.join(ROOT, "cache", "live_sync.json")

# ── ownership rules ────────────────────────────────────────────────────────
# (substring, icon family). Evaluated in order; first hit wins.
# Ordered most-specific-first. Company icons (gpt, gemini, glm...) come
# before generic catch-alls so a model name never resolves to a company logo
# when the model itself has an identity.
RULES = [
    # ── dedicated model identities ──
    ("magistral", "magistral"), ("ministral", "ministraux"), ("ministr", "ministraux"),
    ("pixtral", "pixtral"), ("codestral", "codestral"), ("leanstral", "leanstral"),
    ("devstral", "devstral"), ("codegemma", "gemma"), ("diffusiongemma", "gemma"),
    ("jamba", "ai21"), ("jamba2", "ai21"),
    ("mixtral", "mistral"), ("ministral-", "ministraux"),
    ("mythomax", "mythomax"), ("mytho", "mythomax"),
    ("mellum", "mistral"), ("hy", "hunyuan"),
    ("grok", "grok"), ("flux", "flux"), ("sora", "sora"), ("codex", "codex"),
    ("doubao", "doubao"), ("seedream", "seed"), ("seed", "seed"),
    ("command", "commanda"), ("aya", "aya"), ("north", "north"),
    ("nemotron", "nemotron"), ("parakeet", "nemotron"),
    ("switchyard", "nemotron"), ("laguna", "nemotron"), ("llama", "llama"),
    ("qwen", "qwen"), ("qwq", "qwen"), ("wan", "wan"), ("tongyi", "qwen"),
    ("kimi", "kimi"), ("moonshot", "kimi"), ("glm", "glm"), ("zhipu", "glm"),
    ("zai", "glm"), ("chatglm", "glm"),
    ("deepseek", "deepseek"), ("granite", "granite"), ("ibm", "granite"),
    ("gemma", "gemma"), ("gemini", "gemini"), ("google", "gemini"),
    ("lyria", "gemini"), ("imagen", "gemini"), ("veo", "gemini"),
    ("claude", "claude"), ("anthropic", "claude"), ("sonnet", "claude"),
    ("opus", "claude"), ("haiku", "claude"),
    ("gpt", "gpt"), ("openai", "gpt"), ("whisper", "gpt"), ("dall", "gpt"),
    ("chirp", "gpt"), ("o1", "gpt"), ("o3", "gpt"), ("o4", "gpt"),
    ("mistral", "mistral"), ("voxtral", "voxtral"), ("devstral", "devstral"),
    ("cohere", "cohere"), ("command", "commanda"),
    ("hailuo", "hailuo"), ("minimax", "minimax"),
    ("upstage", "upstage"), ("solar", "upstage"), ("document", "upstage"),
    ("stability", "stability"), ("sdxl", "stability"), ("stable-diffusion", "stability"),
    ("stepfun", "stepfun"), ("step", "stepfun"),
    ("yi", "yi"), ("internlm", "internlm"), ("intern", "internlm"),
    ("nova", "nova"), ("amazon", "nova"),
    ("aion", "aion"), ("menlo", "menlo"), ("union", "unionalpha"), ("pareto", "unionalpha"),
    ("dbrx", "dbrx"), ("ai21", "ai21"),
    ("sensenova", "sensenova"), ("baidu", "baidu"), ("ernie", "baidu"),
    ("tencent", "tencent"), ("hunyuan", "hunyuan"),
    ("cloudflare", "cloudflare"), ("apertus", "cloudflare"), ("clef", "cloudflare"),
    ("sarvam", "sarvam"), ("sarvam105", "sarvam"),
    ("mimo", "mimo"), ("xiaomi", "mimo"),
    ("poolside", "poolside"), ("longcat", "longcat"), ("meituan", "longcat"),
    ("micro", "microsoft"), ("phi", "microsoft"), ("bitnet", "microsoft"),
    ("nemotron", "nemotron"), ("cuda", "nvidia"),
    ("fuyu", "jamba"), ("cosmos", "jamba"), ("kosmos", "jamba"),
    ("starcoder", "nvidia"), ("neva", "nvidia"), ("nv", "nvidia"),
    ("gptimage", "gpt"),
    ("tngtech", "tngtech"), ("thirty", "tngtech"),
    ("venice", "venice"),
    ("happyhorse", "happyhorse"),
    ("morph", "morph"),
    ("lfm", "mistral"), ("apodex", "mistral"), ("inkling", "mistral"),
    ("mercury", "mistral"), ("lion", "mistral"), ("atria", "mistral"),
    ("agnes", "mistral"), ("jina", "mistral"), ("hrllm", "mistral"),
    ("typhoon", "typhoon"),
    ("eurollm", "cloudflare"), ("nex", "cloudflare"),
]

# Router/pseudo-model keywords: not a model, must never get a real brand icon.
ROUTER_WORDS = {
    "auto", "best", "free", "cheap", "fast", "faster", "ultrafast", "thrifty",
    "smart", "coding", "chat", "vision", "reasoning", "multimodal", "offline",
    "chaos", "demo", "pro", "space", "subscription", "rerank", "embed",
    "embedding", "distil", "nano", "ising", "riva", "tacotron2", "fastpitch",
    "voicellm", "l3", "jev", "z", "hy4", "union",
}

DEFAULT_ICON = "default"


def available_icons():
    found = set()
    for d in ICON_DIRS:
        if os.path.isdir(d):
            found.update(f[:-4] for f in os.listdir(d) if f.endswith(".svg"))
    return found


def strip_tags(model_id):
    """openrouter/free:free/agnes-2.0-flash -> agnes"""
    tail = (model_id or "").split("/")[-1]
    tail = tail.split(":")[0]
    return tail.lower()


def is_router(model_id):
    tail = strip_tags(model_id)
    return tail in ROUTER_WORDS


def resolve(model_id, icons):
    """Return an icon family for a model id. Never returns None."""
    tail = strip_tags(model_id)
    if tail in ROUTER_WORDS:
        return DEFAULT_ICON
    if tail in icons:                       # exact family match wins
        return tail
    # longest rule wins so "ministral" beats "min"
    hits = [(len(name), icon) for name, icon in RULES if name in tail]
    if hits:
        hits.sort(reverse=True)
        return hits[0][1]
    return DEFAULT_ICON


def build():
    if not os.path.exists(CACHE):
        print(f"no cache at {CACHE}; run live_sync.py first", file=sys.stderr)
        return 1
    with open(CACHE, encoding="utf-8") as fh:
        cache = json.load(fh)
    cache.pop("_meta", None)

    icons = available_icons()
    manifest, stats = {}, {"exact": 0, "rule": 0, "default": 0}
    for pid, prov in cache.items():
        if pid.startswith("_"):
            continue
        for m in prov.get("models", []):
            mid = m.get("id")
            if not mid:
                continue
            fam = resolve(mid, icons)
            if fam == DEFAULT_ICON:
                stats["default"] += 1
            elif strip_tags(mid) == fam:
                stats["exact"] += 1
            else:
                stats["rule"] += 1
            manifest[mid] = f"/model-icons/{fam}.svg"

    for d in ICON_DIRS:
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "manifest.json"), "w", encoding="utf-8") as fh:
            json.dump(manifest, fh, indent=2, sort_keys=True)

    total = sum(stats.values())
    print(json.dumps({
        "models": total,
        "exact_match": stats["exact"],
        "rule_match": stats["rule"],
        "default": stats["default"],
        "coverage_pct": round(100 * (total - stats["default"]) / total, 1) if total else 0,
        "manifest": f"{ICON_DIRS[0]}/manifest.json",
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(build())