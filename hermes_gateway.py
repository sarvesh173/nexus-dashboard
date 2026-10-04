"""
hermes_gateway.py — read the real provider + model catalog from Hermes.

Hermes exposes an OpenAI-compatible gateway (OmniRoute by default) on
127.0.0.1:20128. Its /v1/models endpoint is the live source of truth for which
providers and models actually exist, so the dashboard never has to guess.

Nothing here invents a connection: the key already present in the Hermes
process environment is reused.
"""

import json
import os
import re
import urllib.error
import urllib.request

GATEWAY = os.environ.get('HERMES_GATEWAY_URL', 'http://127.0.0.1:20128/v1')
ENV_FILES = ('/home/kira/.hermes/.env',)
KEY_NAMES = ('OMNIROUTE_API_KEY', 'OMNIROUTER_API_KEY', 'API_KEY')

# Prefixes that are routing layers, not model vendors.
ROUTER_HINTS = ('auto', 'freee', 'drd', 'cf', 'free-ai', 'router', 'openrouter',
                'charm-hyper', 'qwc', 'kenari', 'electronhub')

_cache = {'models': [], 'at': 0, 'error': None}
TTL = 120


def _key():
    for name in KEY_NAMES:
        k = os.environ.get(name)
        if k:
            return k
    for path in ENV_FILES:
        try:
            with open(path, encoding='utf-8', errors='replace') as fh:
                for line in fh:
                    for name in KEY_NAMES:
                        if line.startswith(name + '='):
                            v = line.split('=', 1)[1].strip().strip('"').strip("'")
                            if v:
                                return v
        except Exception:
            continue
    return ''


def _get(path, timeout=20):
    req = urllib.request.Request(
        GATEWAY.rstrip('/') + path,
        headers={'Authorization': 'Bearer ' + _key()} if _key() else {},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)


def list_models(force=False):
    """Sorted list of model ids live on the gateway."""
    import time
    if not force and _cache['models'] and time.time() - _cache['at'] < TTL:
        return _cache['models']
    try:
        data = _get('/models')
    except Exception as exc:
        # Serving the stale list is the right behaviour, but the failure has to
        # be recorded. Silently returning it made status() report ok: True while
        # the gateway was returning 401, so a dead gateway looked healthy.
        _cache['error'] = f'{type(exc).__name__}: {exc}'
        return _cache['models']
    ids = sorted({m.get('id') for m in data.get('data', []) if m.get('id')})
    _cache.update({'models': ids, 'at': time.time(), 'error': None})
    return ids


# Modality keywords, checked in order. First match wins.
_CAT_RULES = (
    ('embedding', ('embed', 'retriever', 'nv-embedqa', 'nemoretriever')),
    ('tts', ('tts', 'speech', 'magpie', 'chatterbox', 'voice', 'aura-')),
    ('stt', ('whisper', 'parakeet', 'canary', 'asr', 'stt', 'riva-translate',
             'transcribe', 'speech-recog')),
    ('image-gen', ('flux', 'sdxl', 'stable-diffusion', 'stable-diffusion',
                   'sana', 'image-gen', 'dalle', 'imagen', 'qwen-image')),
    ('video', ('video', 'cosmos', 'svd', 'ltx', 'wan2', 'hunyuan-video')),
    ('vision', ('vision', 'vl', 'vlm', 'llava', 'fuyu', 'kosmos', 'neva',
                'vila', 'paligemma', 'pixtral', 'internvl', 'qwen-vl', 'omni')),
    ('decision', ('reason', 'thinking', 'dbrx', 'o1', 'o3', 'o4', 'r1')),
    ('text', ('embed',)),          # unreachable, kept for clarity
)


def categorise(model_id):
    """Best-effort modality for a gateway model id."""
    m = model_id.lower()
    for cat, keys in _CAT_RULES:
        if any(k in m for k in keys):
            return cat
    return 'text'


# Brands whose display name is a fixed acronym. The gateway serves the same
# model under many spellings (glm-5.3, GLM-5.3-Flash, zai-org-glm-5-3-flash,
# glm-52); every one of them must render as "GLM ...".
_BRAND = (
    ('glm', 'GLM'), ('gpt', 'GPT'), ('claude', 'Claude'), ('gemini', 'Gemini'),
    ('gemma', 'Gemma'), ('llama', 'Llama'), ('deepseek', 'DeepSeek'),
    ('qwen', 'Qwen'), ('mistral', 'Mistral'), ('nemotron', 'Nemotron'),
    ('phi', 'Phi'), ('grok', 'Grok'), ('flux', 'FLUX'), ('whisper', 'Whisper'),
    ('parakeet', 'Parakeet'), ('kimi', 'Kimi'), ('minimax', 'MiniMax'),
    ('dall', 'DALL'), ('sdxl', 'SDXL'), ('tts', 'TTS'), ('asr', 'ASR'),
    ('oss', 'OSS'), ('it', 'IT'), ('ctc', 'CTC'), ('vl', 'VL'),
    ('ui', 'UI'), ('cpu', 'CPU'), ('gpu', 'GPU'), ('r1', 'R1'),
    ('aio', 'AIO'), ('moe', 'MoE'), ('ocr', 'OCR'), ('tts', 'TTS'),
)

# Prefixes that are routing noise inside a model id, not part of its name.
_VENDOR_NOISE = re.compile(
    r'(?i)^(?:zai-org|zai-z|z-ai|zai|qwen|hf|huggingface|google|nvidia|meta|'
    r'microsoft|openai|mistralai|moonshotai|deepseek-ai|bytedance|alibaba|'
    r'@cf|@huggingface|cf)-'
)


def _brand_case(word):
    low = word.lower()
    for needle, proper in _BRAND:
        if low.startswith(needle):
            return proper + word[len(needle):]
    return None


# Some routers prefix the vendor to the brand ('morph-glm52-744b',
# 'olafangensan-glm-4.7-flash-heretic'). The brand still leads the name.
_BRAND_LEADS = ('glm',)


def _lead_with_brand(words):
    """Move a brand token to the front if it appears later in the name."""
    for brand in _BRAND_LEADS:
        for i, w in enumerate(words):
            if w.upper().startswith(brand.upper()) and i > 0:
                rest = words[:i] + words[i + 1:]
                return [w] + rest
    return words


def normalise(model_id):
    """
    Canonical display name for a model id.

    Strips the vendor prefix, collapses separators, fixes brand casing, and
    repairs digit/letter boundaries so 'glm-5-3-flash' reads as 'GLM 5.3 Flash'
    rather than 'Glm 5 3 Flash'.
    """
    raw = model_id.split('/')[-1]
    raw = raw.split(':')[0]                       # drop ':free' / tags
    raw = _VENDOR_NOISE.sub('', raw)
    if not raw:
        raw = model_id.split('/')[-1]

    s = re.sub(r'[-_./]+', ' ', raw)
    s = re.sub(r'\s+', ' ', s).strip()
    # Rebuild version tokens. The dots were consumed by the collapse above, so
    # a single space between two numbers IS a version join: '4 6' -> '4.6'.
    s = re.sub(r'(?<=\d) (?=\d)', '.', s)
    # ...except when the second number carries a size suffix ('3 2 11b'), which
    # means two separate versions joined by a dot.
    s = re.sub(r'(?<=\d)\.(?=\d{1,2}b\b)', ' ', s)
    if not s:
        return model_id

    out = []
    for w in s.split(' '):
        if not w:
            continue
        brand = _brand_case(w)
        if brand:
            out.append(brand)
        elif w.isupper() and len(w) <= 5:
            out.append(w)
        else:
            out.append(w[:1].upper() + w[1:])

    out = _lead_with_brand(out)
    name = ' '.join(out)
    # '5.3' should not become '5.3.' and 'GLM .3' should not happen
    name = re.sub(r'\s*\.\s*', '.', name)
    return name.strip() or model_id


def _pretty(name):
    """'zhipu/glm-4.6' -> 'Glm 4.6'; '01-ai/yi-large' -> 'Yi Large'."""
    tail = name.split('/')[-1]
    tail = re.sub(r'[-_]+', ' ', tail)
    tail = re.sub(r'(?<=\d)(?=[A-Za-z])', ' ', tail)
    words = [w for w in tail.split() if w]
    if not words:
        return name
    out = []
    for w in words:
        if w.isupper() and len(w) <= 4:
            out.append(w)
        else:
            out.append(w[:1].upper() + w[1:])
    return ' '.join(out)


def _is_router(prefix):
    p = prefix.lower()
    return any(h == p or h in p for h in ROUTER_HINTS)


def catalog():
    """
    -> {'providers': [{id, name, kind, model_count, models:[{id,name,provider}]}],
        'total_models': int}
    """
    ids = list_models()
    groups = {}
    for mid in ids:
        prefix = mid.split('/')[0] if '/' in mid else 'other'
        groups.setdefault(prefix, []).append(mid)

    out = []
    for prefix, mids in groups.items():
        counts = {}
        for m in mids:
            k = categorise(m)
            counts[k] = counts.get(k, 0) + 1
        out.append({
            'id': prefix,
            'name': _pretty(prefix).title() if prefix != 'other' else 'Other',
            'kind': 'router' if _is_router(prefix) else 'direct',
            'model_count': len(mids),
            'categories': counts,
            'models': [{'id': m, 'name': normalise(m), 'provider': prefix,
                         'category': categorise(m)} for m in mids],
        })
    out.sort(key=lambda p: (p['kind'] != 'direct', -p['model_count'], p['id']))
    return {'providers': out,
            'total_models': len(ids),
            'provider_count': len(out)}


def status():
    ids = list_models()
    err = _cache.get('error')
    # ok must mean "the gateway answered", not "we have something cached".
    # A 401 or a dead gateway was reporting ok: True with stale models, which is
    # the same masking failure as the NVIDIA NameError.
    return {'ok': bool(ids) and not err,
            'stale': bool(err),
            'error': err,
            'models': len(ids),
            'gateway': GATEWAY, 'cached_at': _cache['at']}
