#!/usr/bin/env python3
"""Live sync engine.

Watches two sources of truth and merges them so the dashboard never drifts:

  1. Hermes config  ~/.hermes/config.yaml   -> providers + their models
  2. OmniRoute      http://localhost:20128/v1/models (OpenAI-compatible)

Design rules:
  - READ-ONLY on both sources. This module never writes to config.yaml.
  - Cache-first: API callers read the cache, never the network.
  - Fail-soft: if either source is down, the other still serves.
  - Never raises. A dead provider must never take the dashboard down.
"""

import json
import os
import re
import threading
import time
import urllib.request

# ── paths ──────────────────────────────────────────────────────────────────
# live_sync.py sits at the repo root, so one dirname() lands in the repo itself.
ROOT = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(ROOT, "cache")
CACHE_PATH = os.path.join(CACHE_DIR, "live_sync.json")
HERMES_CONFIG = os.path.join(os.path.expanduser("~"), ".hermes", "config.yaml")
OMNIROUTE_ENV = os.path.join(os.path.expanduser("~"), ".omniroute", ".env")

SYNC_INTERVAL = 30  # seconds

_STEM_SPLIT = re.compile(r"[-_:.]")


# ── helpers ────────────────────────────────────────────────────────────────
def _family_stem(model_id: str) -> str:
    """qwen-cloud/qwen3.5-122b -> qwen3   |   openai/whisper-large-v3 -> whisper"""
    tail = (model_id or "").split("/")[-1].lower()
    parts = [p for p in _STEM_SPLIT.split(tail) if p]
    return parts[0] if parts else ""


def _read_env_file(path: str) -> dict:
    """Minimal KEY=VALUE reader. Never raises, never logs values."""
    out = {}
    try:
        with open(path, encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    except OSError:
        pass
    return out


# ── source 0: Hermes gateway catalogue ─────────────────────────────────────
def fetch_gateway():
    """Reuse server.get_live_providers() — the dashboard's original source of
    truth. Never raises; a gateway failure just contributes nothing."""
    try:
        import server
        rows = server.get_live_providers()
    except Exception as exc:                    # noqa: BLE001
        return {}, f"gateway unavailable: {type(exc).__name__}"
    out = {}
    for p in rows or []:
        pid = p.get("id")
        if not pid:
            continue
        models = []
        for m in p.get("models") or []:
            mid = m.get("id") if isinstance(m, dict) else m
            if mid:
                models.append({"id": mid, "name": mid})
        out[pid] = {
            "id": pid,
            "name": p.get("display_name") or p.get("name") or pid,
            "display_name": p.get("display_name") or p.get("name") or pid,
            "kind": p.get("kind"),
            "enabled": p.get("enabled", True),
            "base_url": p.get("base_url"),
            "logo": p.get("logo"),
            "source": "gateway",
            "models": models,
        }
    return out, None


# ── source 1: Hermes config ────────────────────────────────────────────────
def fetch_hermes_config():
    """Read providers + models straight from ~/.hermes/config.yaml. Read-only."""
    try:
        import yaml
        with open(HERMES_CONFIG, encoding="utf-8") as fh:
            cfg = yaml.safe_load(fh) or {}
    except Exception as exc:                       # missing file, bad YAML, no PyYAML
        return {}, f"hermes config unavailable: {type(exc).__name__}"

    providers = {}
    for pid, pcfg in (cfg.get("providers") or {}).items():
        if not isinstance(pcfg, dict):
            continue
        if pcfg.get("enabled") is False:
            continue
        models = []
        for m in (pcfg.get("models") or []):
            mid = m if isinstance(m, str) else (m or {}).get("id") or (m or {}).get("model")
            if mid:
                models.append({"id": mid, "name": mid})
        providers[pid] = {
            "id": pid,
            "name": pid,
            "source": "hermes",
            "base_url": pcfg.get("base_url"),
            "models": models,
        }
    return providers, None


# ── source 2: OmniRoute ────────────────────────────────────────────────────
def omniroute_endpoint():
    """base_url + api_key for the local OmniRoute. Key is never returned to callers."""
    env = _read_env_file(OMNIROUTE_ENV)
    key = env.get("OMNIROUTE_API_KEY", "")
    if not key:
        return {}
    return {"base_url": "http://localhost:20128/v1", "api_key": key}


# OmniRoute is a proxy: it fronts many real providers behind one endpoint.
# Its model ids still carry the real provider prefix, so we can regroup them
# under their true owner instead of lumping all 697 under one "omniroute" row
# that double-counts against the gateway.
#
# Some ids carry routing MODIFIERS before the vendor:
#   no-think/openrouter/anthropic/claude-sonnet-5.5
#   kc/openrouter/free
#   auto/best-chat
# Those are stripped; what remains is the real provider.
_MODIFIER_PREFIXES = {"no-think", "auto", "kc", "thinking", "reasoning", "search"}

# `auto/best-chat`, `auto/pro-coding` etc. are OmniRoute router categories, not
# vendors — after the modifier the next token is a router keyword, so the whole
# id has no real owner and stays bucketed under "omniroute".
_ROUTER_KEYWORDS = {
    "best", "pro", "cheap", "fast", "faster", "free", "coding", "chat",
    "vision", "reasoning", "multimodal", "ultra-fast", "smart", "offline",
    "thrifty", "chaos", "demo", "space", "subscription", "default", "auto",
}


def _is_router_category(token):
    """auto/best-coding, auto/coding:fast -> a router category, not a vendor.

    OmniRoute tags variants with colons ("coding:fast", "pro:cheap"), and a
    category is hyphen/colon-joined. Every segment must be a router keyword.
    """
    parts = [p for p in re.split(r"[-_:]", token) if p]
    return bool(parts) and all(p in _ROUTER_KEYWORDS for p in parts)

# Canonical vendor name for prefixes that differ from the provider id.
_VENDOR_ALIASES = {
    "qwc": "qwen-cloud", "qwen": "qwen-cloud", "tongyi": "qwen-cloud",
    "ali": "alibaba", "bytedance": "volcengine", "doubao": "volcengine",
    "cf": "cloudflare-ai", "cloudflare": "cloudflare-ai",
    "agy": "custom:omniroute", "agy2": "custom:omniroute",
    "charm-hyper": "charm", "drd": "drr", "free-ai": "freeai",
    "jina": "jina-ai", "kenari": "kenari-ai", "adm": "adminech",
    "qwq": "qwen-cloud", "hf": "huggingface", "hf-inference": "huggingface",
    "ollama": "ollamacloud", "oai": "openai", "o": "openai",
    "zai": "zhipu", "z-ai": "zhipu", "glm": "zhipu",
    "moonshotai": "moonshot", "kimi": "moonshot",
    "us": "openai", "anthropic": "anthropic", "claude": "anthropic",
}


def omniroute_vendor(model_id):
    """Real provider behind an OmniRoute model id, or None for router rows.

    Strips leading routing modifiers, then maps the first remaining token
    through _VENDOR_ALIASES. Returns None when nothing usable remains, which
    keeps those rows under the "omniroute" bucket.
    """
    parts = [p for p in (model_id or "").split("/") if p]
    if not parts:
        return None
    idx = 0
    while idx < len(parts) - 1 and parts[idx].lower() in _MODIFIER_PREFIXES:
        idx += 1
    token = parts[idx].lower()
    # a remaining modifier, or a router category token, means no real owner
    if token in _MODIFIER_PREFIXES or _is_router_category(token):
        return None
    return _VENDOR_ALIASES.get(token, token)


def fetch_omniroute():
    """Poll OmniRoute's OpenAI-compatible /models and regroup by real vendor.

    OmniRoute is a proxy, so grouping its catalogue under one provider would
    (a) hide who actually serves each model and (b) double-count every model
    the gateway already reports. Models are bucketed by their id prefix
    instead; anything that is a router keyword goes to "omniroute" itself.
    """
    ep = omniroute_endpoint()
    if not ep:
        return {}, "omniroute: no API key found"
    req = urllib.request.Request(
        ep["base_url"].rstrip("/") + "/models",
        headers={"Authorization": f"Bearer {ep['api_key']}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.load(resp)
    except Exception as exc:
        return {}, f"omniroute unreachable: {type(exc).__name__}"

    rows = data.get("data", data if isinstance(data, list) else [])
    buckets = {}
    for m in rows:
        mid = m.get("id")
        if not mid:
            continue
        vendor = omniroute_vendor(mid) or "omniroute"
        buckets.setdefault(vendor, []).append({"id": mid, "name": m.get("id")})

    return {vid: {
        "id": vid,
        "name": vid,
        "source": "omniroute",
        "via_omniroute": True,
        "base_url": ep["base_url"],
        "models": models,
    } for vid, models in buckets.items()}, None


# ── merge ──────────────────────────────────────────────────────────────────
def merge(*provider_maps):
    """Merge provider maps into one catalogue.

    Within a provider, duplicate model ids collapse. Across providers they do
    NOT collapse: the same model id served by two different routes is genuinely
    two catalog entries, and the dashboard's per-provider counts should reflect
    that. `unique_model_count` is reported separately so the total is honest.
    """
    merged = {}
    for pm in provider_maps:
        for pid, prov in (pm or {}).items():
            if pid.startswith("_"):
                continue
            if pid not in merged:
                merged[pid] = {**prov, "models": list(prov.get("models") or [])}
                continue
            slot = merged[pid]
            seen = {m["id"] for m in slot["models"]}
            for m in prov.get("models") or []:
                if m["id"] not in seen:
                    slot["models"].append(m)
                    seen.add(m["id"])
            if not slot.get("base_url") and prov.get("base_url"):
                slot["base_url"] = prov["base_url"]
    # attach family stems + counts
    for pid, prov in merged.items():
        if pid.startswith("_"):
            continue
        prov["models"].sort(key=lambda m: m["id"])
        for m in prov["models"]:
            stem = _family_stem(m["id"])
            m["family"] = stem
            m["iconKey"] = stem
            m["iconFallback"] = True
        prov["model_count"] = len(prov["models"])
    return merged


# ── cache ──────────────────────────────────────────────────────────────────
def read_cache(path=CACHE_PATH):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def write_cache(data, path=CACHE_PATH, status=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    real = {k: v for k, v in data.items() if not k.startswith("_")}
    entries = sum(len(p.get("models") or []) for p in real.values())
    unique = len({m["id"] for p in real.values() for m in (p.get("models") or [])})
    payload = {
        "_meta": {
            "synced_at": time.time(),
            "providers": len(real),
            # catalog_entries counts every provider->model row the UI renders.
            "models": entries,
            # unique_model_count is the honest "how many distinct models exist".
            "unique_models": unique,
            "duplicate_rows": entries - unique,
            "status": status or {},
        }
    }
    payload.update(data)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)
    os.replace(tmp, path)
    return payload


# ── the sync loop ──────────────────────────────────────────────────────────
def sync_once(path=CACHE_PATH):
    """One full sync. Never raises. Returns (providers, status).

    Three sources merged:
      1. Hermes gateway catalogue (/api/live-providers equivalent) — configured
         providers AND whatever the gateway is actually serving right now.
      2. Hermes config.yaml — providers enabled in config.
      3. OmniRoute /v1/models — the shared cloud endpoint.

    Source 1 is what the dashboard has always shown (81 providers); sources 2-3
    add anything the gateway does not expose. Nothing is lost.
    """
    gateway, gw_err = fetch_gateway()
    hermes, herr_err = fetch_hermes_config()
    omni, omni_err = fetch_omniroute()

    status = {}
    if gw_err:
        status["gateway"] = gw_err
    if herr_err:
        status["hermes"] = herr_err
    if omni_err:
        status["omniroute"] = omni_err

    merged = merge(gateway, hermes, omni)
    status["ok"] = bool(merged) and not (gw_err or herr_err or omni_err)
    status["sources"] = {
        "gateway": len(gateway),
        "hermes": len(hermes),
        "omniroute": len(omni),
    }

    # total failure -> keep serving the last good cache rather than going blank
    if not merged:
        cached = read_cache(path)
        if cached:
            return cached, {"ok": False, "error": "all sources down; serving stale cache"}
        return {}, {"ok": False, "error": "all sources down and no cache"}

    write_cache(merged, path, status)
    return merged, status


def start_background(path=CACHE_PATH, interval=SYNC_INTERVAL):
    """Background thread. Syncs immediately, then every `interval` seconds."""
    def _loop():
        while True:
            try:
                sync_once(path)
            except Exception:
                pass                      # a sync failure must never kill the thread
            time.sleep(interval)

    t = threading.Thread(target=_loop, daemon=True, name="nexus-live-sync")
    t.start()
    return t


if __name__ == "__main__":
    providers, status = sync_once()
    meta = read_cache().get("_meta", {})
    print(json.dumps({
        "providers": meta.get("providers"),
        "models": meta.get("models"),
        "status": status,
    }, indent=2))