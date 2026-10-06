#!/usr/bin/env python3
"""Evidence harness for server.py's JSON serialization + telemetry log paths.

Run: python3 tests/audit_server_serialization.py

Boots the real TelemetryHandler against a loopback server so the observed
behaviour is the observed behaviour of the shipped code path, not a mock.
"""
import io
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


# ---------------------------------------------------------------- send_json
class Probe(srv.TelemetryHandler):
    """Exercises TelemetryHandler.send_json with payloads the routes could
    plausibly hand it, plus payloads no current route sends today."""

    def do_GET(self):
        payload = self.path[len('/probe/'):]
        if payload == 'normal':
            return self.send_json({'ok': True, 'v': 1})
        if payload == 'set':
            return self.send_json({'ok': True, 'tags': {'a', 'b'}})      # set
        if payload == 'nan':
            return self.send_json({'ok': True, 'v': float('nan')})        # NaN
        if payload == 'inf':
            return self.send_json({'ok': True, 'v': float('inf')})        # Infinity
        if payload == 'bytes':
            return self.send_json({'ok': True, 'v': b'\xff\xfe'})         # bytes
        if payload == 'nanjson':
            return self.send_json(json.loads('{"ok": true, "v": NaN}'))   # what json.loads accepts
        if payload == 'circular':
            d = {}
            d['self'] = d                                            # cycle
            return self.send_json({'ok': True, 'v': d})
        if payload == 'deep':
            d = {'v': 1}
            for _ in range(200):
                d = {'n': d}
            return self.send_json({'ok': True, 'd': d})
        return self.send_json({'ok': False, 'error': 'unknown probe'}, 404)

    do_POST = do_GET


def fetch(port, path):
    """Returns (http_status_or_None, body_or_exception). None status == the
    server answered with no HTTP response at all (connection dropped)."""
    url = f'http://127.0.0.1:{port}{path}'
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            return r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'replace')
    except Exception as e:                       # noqa: BLE001
        return None, f'{type(e).__name__}: {e}'


def probe_serialization():
    print('=== 1. TelemetryHandler.send_json payload tolerance ===')
    srv.TelemetryHandler.log_message = lambda *a, **k: None
    httpd = HTTPServer(('127.0.0.1', 0), Probe)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    try:
        for name in ('normal', 'set', 'bytes', 'circular', 'deep',
                     'nan', 'inf', 'nanjson'):
            status, body = fetch(port, f'/probe/{name}')
            verdict = 'ok'
            note = ''
            if status is None:
                verdict = 'DROPPED'
                note = ' <- no HTTP response at all'
            else:
                try:
                    parsed = json.loads(body)
                except Exception:
                    verdict = 'INVALID-JSON'
                    note = f' <- body not parseable: {body[:60]!r}'
                    parsed = None
                if parsed is not None and isinstance(parsed, dict):
                    for k, v in parsed.items():
                        if isinstance(v, float) and (v != v or v in (float('inf'), float('-inf'))):
                            verdict = 'INVALID-JSON'
                            note = f' <- {k}={v} is not legal JSON'
            print(f'  {name:<9} HTTP={str(status):<5} {verdict:<14}{note}')
    finally:
        httpd.shutdown()


# ------------------------------------------------------- corrupted log lines
def probe_log_parser():
    print('\n=== 2. _parse_log_line against corrupted input ===')
    hostile = {
        'empty string': '',
        'single char': 'x',
        'exact length-27 boundary': 'A' * 27,
        'exact length-28 boundary': 'B' * 28,
        'timestamp only, no level': '2026-10-07 02:44:35,209',
        'valid, no logger': '2026-10-07 02:44:35,209 INFO',
        'valid, empty message': '2026-10-07 02:44:35,209 INFO a.b:',
        'no-milliseconds form': '2026-10-07 02:44:35 INFO a.b: hello',
        'NUL bytes': '2026-10-07 02:44:35,209 INFO a.b: he\x00llo',
        'unicode': '2026-10-07 02:44:35,209 INFO a.b: 你好 \U0001f600',
        'lone surrogate': '2026-10-07 02:44:35,209 INFO a.b: \ud800',
        'colons in message': '2026-10-07 02:44:35,209 ERROR a: b: c: d',
        'tabs': '2026-10-07 02:44:35,209\tINFO\ta.b:\tx',
        'CRLF': '2026-10-07 02:44:35,209 INFO a.b: hi\r',
        'huge level token': '2026-10-07 02:44:35,209 ' + 'X' * 5000 + ' a.b: y',
        'negative/garbage level': '2026-10-07 02:44:35,209 -5 a.b: y',
        'json-ish line': '{"a": 1, "b": [2,3]}',
        'traceback fragment': '  File "x.py", line 1, in <module>',
    }
    crashed = 0
    for label, raw in hostile.items():
        try:
            out = srv._parse_log_line(raw)
            shown = 'None' if out is None else json.dumps(out)[:64]
            print(f'  {label:<32} -> {shown}')
        except Exception as e:                       # noqa: BLE001
            crashed += 1
            print(f'  {label:<32} -> CRASH {type(e).__name__}: {e}')
    print(f'  parser crashes: {crashed}/{len(hostile)}')
    return crashed


def probe_log_tail(tmpdir):
    print('\n=== 3. get_hermes_logs tail window + corrupted file bodies ===')
    d = srv.hermes_logs_dir
    srv.hermes_logs_dir = lambda: tmpdir
    saved = srv._hermes_log_cache
    srv._hermes_log_cache = {'at': 0.0, 'key': None, 'payload': None}
    try:
        cases = {
            'normal lines': '2026-10-07 02:44:35,209 INFO a.b: hi\n' * 500,
            'all binary': os.urandom(64 * 1024).decode('utf-8', 'replace'),
            'no trailing newline': '2026-10-07 02:44:35,209 INFO a.b: hi',
            'only newlines': '\n' * 5000,
            'one enormous line': '2026-10-07 02:44:35,209 INFO a.b: ' + 'z' * 200000,
            'nul-heavy': '\x00\n\x00\n' * 5000,
        }
        for label, body in cases.items():
            path = os.path.join(tmpdir, 'gateway.log')
            with open(path, 'w', encoding='utf-8', errors='replace') as fh:
                fh.write(body)
            srv._hermes_log_cache = {'at': 0.0, 'key': None, 'payload': None}
            try:
                out = srv.get_hermes_logs(50, 'gateway')
                recs = out['logs']
                biggest = max((len(str(r)) for r in recs), default=0)
                print(f'  {label:<24} count={out["count"]:<5} '
                      f'serialises={len(json.dumps(out)):<7} '
                      f'largest_record={biggest}')
            except Exception as e:                    # noqa: BLE001
                print(f'  {label:<24} CRASH {type(e).__name__}: {e}')

        # A limit larger than the number of records must not invent any.
        with open(os.path.join(tmpdir, 'gateway.log'), 'w') as fh:
            fh.write('2026-10-07 02:44:35,209 INFO a.b: hi\n')
        srv._hermes_log_cache = {'at': 0.0, 'key': None, 'payload': None}
        print(f'  limit clamp (limit=10**9) -> count='
              f'{srv.get_hermes_logs(10**9, "gateway")["count"]}')
        srv._hermes_log_cache = {'at': 0.0, 'key': None, 'payload': None}
        print(f'  negative limit            -> count='
              f'{srv.get_hermes_logs(-5, "gateway")["count"]}')
        srv._hermes_log_cache = {'at': 0.0, 'key': None, 'payload': None}
        print(f'  non-numeric limit         -> count='
              f'{srv.get_hermes_logs("abc", "gateway")["count"]}')
    finally:
        srv.hermes_logs_dir = d
        srv._hermes_log_cache = saved


def probe_missing_source(tmpdir):
    print('\n=== 4. get_hermes_logs with the log file absent ===')
    d = srv.hermes_logs_dir
    srv.hermes_logs_dir = lambda: os.path.join(tmpdir, 'does-not-exist')
    saved = srv._hermes_log_cache
    srv._hermes_log_cache = {'at': 0.0, 'key': None, 'payload': None}
    try:
        for src in srv.HERMES_LOG_SOURCES:
            srv._hermes_log_cache = {'at': 0.0, 'key': None, 'payload': None}
            try:
                out = srv.get_hermes_logs(10, src)
                print(f'  source={src:<8} ok error={out["error"]!r}')
            except Exception as e:                    # noqa: BLE001
                print(f'  source={src:<8} CRASH {type(e).__name__}: {e}')
    finally:
        srv.hermes_logs_dir = d
        srv._hermes_log_cache = saved


def probe_unserialisable_status(tmpdir):
    """A gateway heartbeat written by a different/older build can hold values
    that json.dumps refuses. Round-trip get_hermes_status() through the exact
    serialisation the route performs."""
    print('\n=== 5. get_hermes_status() payload is JSON-serialisable ===')
    try:
        payload = srv.get_hermes_status()
        json.dumps(payload)
        print('  current live state: serialises ok')
    except Exception as e:                            # noqa: BLE001
        print(f'  CRASH {type(e).__name__}: {e}')
        return

    saved = srv.hermes_gateway_state_path
    srv.hermes_gateway_state_path = lambda: os.path.join(tmpdir, 'gateway_state.json')
    saved_cache = srv._hermes_state_cache
    try:
        hostile = {
            'pid as string': {'pid': '1086'},
            'pid as float': {'pid': 1086.5},
            'platforms not a dict': {'platforms': ['discord', 'telegram']},
            'platforms entry not a dict': {'platforms': {'discord': 'connected'}},
            'active_agents as set-like junk': {'active_agents': {'a': 1}, 'nan': float('nan')},
            'nan uptime': {'uptime_sec': float('nan')},
            'served_profiles not a list': {'served_profiles': {'default': True}},
        }
        for label, state in hostile.items():
            with open(os.path.join(tmpdir, 'gateway_state.json'), 'w') as fh:
                json.dump(state, fh, allow_nan=True)
            srv._hermes_state_cache = {'at': 0.0, 'payload': None}
            srv._hermes_model_cache = {'at': 0.0, 'payload': None}
            try:
                payload = srv.get_hermes_status()
                json.dumps(payload)
                print(f'  {label:<30} ok')
            except Exception as e:                    # noqa: BLE001
                print(f'  {label:<30} CRASH {type(e).__name__}: {e}')
    finally:
        srv.hermes_gateway_state_path = saved
        srv._hermes_state_cache = saved_cache


if __name__ == '__main__':
    import tempfile
    probe_serialization()
    crashes = probe_log_parser()
    with tempfile.TemporaryDirectory() as td:
        probe_log_tail(td)
        probe_missing_source(td)
        probe_unserialisable_status(td)
    print('\ndone.')
    sys.exit(1 if crashes else 0)