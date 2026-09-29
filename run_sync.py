#!/usr/bin/env python3
"""
run_sync.py — periodic model-health sync for the Nexus dashboard.

Probes every NVIDIA model on its real endpoint using the key already in the
Hermes config (no new connections), writes model_health.json, and the backend
auto-hides anything marked RETIRED on the next request.

Usage:  python3 run_sync.py [--dry]
"""

import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import model_health  # noqa: E402

BASE = 'https://integrate.api.nvidia.com/v1'


def fetch_specs():
    """(model_id, category) straight from the live NVIDIA catalog."""
    import yaml
    import requests

    key = model_health._api_key()
    if not key:
        raise SystemExit('no NVIDIA key found in Hermes config')

    with open('/home/kira/.hermes/config.yaml') as fh:
        cfg = yaml.safe_load(fh) or {}
    nv = (cfg.get('providers') or {}).get('nvidia') or {}
    base = nv.get('base_url') or BASE

    # Reuse the backend's own categorisation so sync and dashboard agree
    sys.path.insert(0, '/home/kira/nexus-dashboard')
    os.environ['PYTHONPATH'] = '/home/kira/nexus-dashboard'

    specs = []
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            'srv', '/home/kira/nexus-dashboard/server.py')
        # server.py starts an HTTP server only under __main__, so import is safe
        srv = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(srv)
        for p in srv.get_hermes_config_providers():
            for m in p.get('models', []):
                specs.append((m['id'], m.get('category', 'text')))
    except Exception as exc:
        print('[sync] server import failed ({}), falling back to keyword '
              'categorisation'.format(type(exc).__name__))

    if not specs:
        r = requests.get(base.rstrip('/') + '/models', timeout=20,
                         headers={'Authorization': 'Bearer {key}'.format(key=key)})
        for m in r.json().get('data', []):
            mid = m.get('id', '').lower()
            cat = 'text'
            if any(k in mid for k in ('embed', 'retriever')):
                cat = 'embedding'
            elif any(k in mid for k in ('diffusion', 'sdxl', 'flux', 'sana')):
                cat = 'image-gen'
            elif any(k in mid for k in ('vision', 'fuyu', 'kosmos', 'neva',
                                        'vila', '-vl-', 'vlm', 'paligemma')):
                cat = 'vision'
            elif any(k in mid for k in ('tts', 'voice', 'magpie', 'chatterbox')):
                cat = 'tts'
            elif any(k in mid for k in ('stt', 'whisper', 'parakeet', 'canary',
                                        'riva-translate', 'asr')):
                cat = 'stt'
            elif any(k in mid for k in ('reason', 'dbrx', 'thinking')):
                cat = 'decision'
            specs.append((m['id'], cat))

    # dedupe, preserve order
    seen = set()
    out = []
    for mid, cat in specs:
        if mid not in seen:
            seen.add(mid)
            out.append((mid, cat))
    return out


def main():
    dry = '--dry' in sys.argv
    specs = fetch_specs()
    print('[sync] {} model(s) to probe'.format(len(specs)))

    if dry:
        for mid, cat in specs:
            print('  {:9} {}'.format(cat, mid))
        return 0

    started = time.time()
    reg = model_health.sync_models(specs, BASE)
    summary = model_health.summary()
    print('[sync] done in {:.0f}s -> {}'.format(
        time.time() - started, json.dumps(summary['counts'])))
    hidden = [m for m, r in reg['models'].items() if r.get('status') == 'RETIRED']
    if hidden:
        print('[sync] hidden {} retired model(s)'.format(len(hidden)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
