#!/usr/bin/env python3
"""Route smoke test for the server.py changes, against a real HTTPServer.

Run: python3 tests/audit_server_routes.py

Boots the actual TelemetryHandler on a spare port and exercises every route
that was touched, asserting each answers with a parseable JSON body over HTTP.
"""
import json
import os
import sys
import threading
import urllib.request
import urllib.error
from http.server import HTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import server as srv  # noqa: E402

srv.TelemetryHandler.log_message = lambda *a, **k: None
httpd = HTTPServer(('127.0.0.1', 0), srv.TelemetryHandler)
PORT = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{PORT}'


def call(path, method='GET', body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={'Content-Type': 'application/json'} if data else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.headers.get('Content-Length'), r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get('Content-Length'), e.read().decode('utf-8', 'replace')
    except Exception as e:                                    # noqa: BLE001
        return None, None, f'{type(e).__name__}: {e}'


failures = []
print('=== routes exercised over real HTTP ===')
CASES = [
    ('GET', '/api/stats', None),
    ('GET', '/api/cost-overview', None),
    ('GET', '/api/providers', None),
    ('GET', '/api/all-providers', None),
    ('GET', '/api/live-providers', None),
    ('GET', '/api/synced-models', None),
    ('GET', '/api/sync-status', None),
    ('GET', '/api/visibility', None),
    ('GET', '/api/hermes/status', None),
    ('GET', '/api/hermes/logs?limit=5', None),
    ('GET', '/api/hermes/logs?limit=5&source=errors', None),
    ('GET', '/api/hermes/logs?limit=abc', None),
    ('GET', '/api/hermes/logs?limit=99999999', None),
    ('GET', '/api/hermes/logs?source=../../../etc/passwd', None),
    ('GET', '/api/gateway-status', None),
    ('GET', '/api/health', None),
    ('GET', '/api/model/context?model=gpt-4o', None),
    ('GET', '/api/model/connection-health', None),
    ('GET', '/api/does-not-exist', None),
    ('POST', '/api/visibility', {'kind': 'models', 'id': 'smoke/test', 'hidden': True}),
    ('POST', '/api/visibility', {'kind': 'bogus', 'id': 'x'}),
    ('POST', '/api/visibility/reset', None),
    ('POST', '/api/model/active', {'model': 'smoke/model', 'provider': 'smoke'}),
    ('POST', '/api/model/test', {}),
    ('POST', '/api/model/test', {'model': '', 'max_tokens': 'not-a-number'}),
    ('POST', '/api/nope', {}),
]

for method, path, body in CASES:
    status, clen, text = call(path, method, body)
    problems = []
    if status is None:
        problems.append('NO HTTP RESPONSE')
    else:
        try:
            json.loads(text)
        except Exception:                                    # noqa: BLE001
            problems.append(f'body not JSON: {text[:60]!r}')
        if clen is None:
            problems.append('missing Content-Length')
        elif str(clen) != str(len(text.encode('utf-8'))):
            problems.append(f'Content-Length {clen} != body {len(text.encode())}')
    flag = 'FAIL' if problems else 'ok'
    if problems:
        failures.append((method, path, problems))
    print(f'  [{flag:>4}] {method:<4} {path:<52} HTTP={str(status):<5} len={clen}')

# Restore the active-model store the smoke test overwrote.
try:
    store = os.path.join(ROOT, 'active_model_store.json')
    if os.path.exists(store):
        with open(store) as fh:
            prior = json.load(fh)
        if prior.get('model') == 'smoke/model':
            with open(store, 'w') as fh:
                json.dump({'model': '', 'provider': ''}, fh)
            print('\n  (restored active_model_store.json)')
except Exception as e:                                        # noqa: BLE001
    print(f'\n  note: could not restore active_model_store.json: {e}')

httpd.shutdown()
print(f'\n{len(CASES) - len(failures)}/{len(CASES)} routes clean')
sys.exit(1 if failures else 0)