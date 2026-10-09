from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import re
import subprocess
import os
import sys
import time
import urllib.error
import urllib.request

try:
    import yaml
except ImportError:
    yaml = None

try:
    import psutil
except ImportError:
    psutil = None

try:
    import requests
except ImportError:
    requests = None
from paths import (
    hermes_config_path,
    hermes_env_path,
    hermes_gateway_state_path,
    hermes_logs_dir,
    hermes_profiles_dir,
    hermes_profile_logs_dir,
    omniroute_env_path,
    OMNI_BASE,
)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

try:
    import model_health
except ImportError:
    model_health = None

try:
    import hermes_gateway
except ImportError:
    hermes_gateway = None

try:
    import visibility
except ImportError:
    visibility = None

try:
    import agent_stream
except ImportError:
    agent_stream = None

try:
    import omniroute_logs
except ImportError:
    omniroute_logs = None

_cached_data = None
_last_poll_time = 0
CACHE_TTL = 7.0  # 7-second hardware polling delay to reduce CPU overhead

_cached_providers = None
_last_provider_time = 0
PROVIDER_CACHE_TTL = 60.0  # 60s cache for provider model sync

# The gateway's OpenAI-compatible responses carry token usage when the upstream
# provides it. Keep a small local ledger so the dashboard can report what this
# backend actually sent through the gateway instead of rendering a UI placeholder.
_COST_LEDGER_FILE = os.path.join(CURRENT_DIR, '.nexus-cost-usage.json')
_DEFAULT_RATE_CARD = (0.15, 0.60)  # published USD per 1M tokens fallback
_MODEL_RATE_CARDS = (
    ('gpt-6.1-sol', (0.00, 0.00)),
    ('gpt-6-sol', (0.00, 0.00)),
    ('gpt-6-astra', (0.00, 0.00)),
    ('gpt-4o', (2.50, 10.00)),
    ('claude-3-5', (3.00, 15.00)),
    ('claude-3', (3.00, 15.00)),
    ('gemini', (1.25, 5.00)),
    ('deepseek', (0.27, 1.10)),
    ('llama', (0.10, 0.30)),
    ('nemotron', (0.10, 0.30)),
)


def _empty_cost_ledger():
    return {
        'input_tokens': 0,
        'output_tokens': 0,
        'total_accrued_usd': 0.0,
        'request_count': 0,
        'input_rate_usd_per_million': _DEFAULT_RATE_CARD[0],
        'output_rate_usd_per_million': _DEFAULT_RATE_CARD[1],
        'last_synced': None,
        'last_model': None,
        'last_usage_source': None,
    }


def _load_cost_ledger():
    try:
        with open(_COST_LEDGER_FILE, 'r', encoding='utf-8') as ledger_file:
            saved = json.load(ledger_file)
        ledger = _empty_cost_ledger()
        for key in ledger:
            if key in saved:
                ledger[key] = saved[key]
        return ledger
    except (OSError, TypeError, ValueError):
        return _empty_cost_ledger()


_cost_ledger = _load_cost_ledger()


def _save_cost_ledger():
    try:
        temporary = _COST_LEDGER_FILE + '.tmp'
        with open(temporary, 'w', encoding='utf-8') as ledger_file:
            json.dump(_cost_ledger, ledger_file)
        os.replace(temporary, _COST_LEDGER_FILE)
    except OSError:
        # Cost reporting must never make a successful model request fail.
        pass


def _positive_int(value):
    try:
        number = int(value)
        return number if number > 0 else 0
    except (TypeError, ValueError):
        return 0


def _estimated_tokens(value):
    text = str(value or '').strip()
    return max(1, round(len(text) / 4)) if text else 0


def _rate_card_for_model(model_id):
    model_name = str(model_id or '').lower()
    for needle, rates in _MODEL_RATE_CARDS:
        if needle in model_name:
            return rates
    return _DEFAULT_RATE_CARD


def record_cost_usage(model_id, usage=None, prompt=None, reply=None):
    """Record one successful gateway request using response usage when present.

    Some OpenAI-compatible gateways omit ``usage`` even on a successful
    response. In that case the request and response text provide a conservative
    token estimate; it is still tied to a real request made by this backend and
    is marked as estimated in the API response.
    """
    usage = usage if isinstance(usage, dict) else {}
    input_tokens = _positive_int(
        usage.get('prompt_tokens') or usage.get('input_tokens')
        or usage.get('prompt_token_count')
    )
    output_tokens = _positive_int(
        usage.get('completion_tokens') or usage.get('output_tokens')
        or usage.get('completion_token_count')
    )
    usage_source = 'gateway usage'
    if not input_tokens:
        input_tokens = _estimated_tokens(prompt)
        usage_source = 'estimated from request/response'
    if not output_tokens:
        output_tokens = _estimated_tokens(reply)
        usage_source = 'estimated from request/response'
    if not input_tokens and not output_tokens:
        return None

    input_rate, output_rate = _rate_card_for_model(model_id)
    reported_cost = usage.get('cost') or usage.get('cost_usd')
    try:
        reported_cost = float(reported_cost)
    except (TypeError, ValueError):
        reported_cost = 0.0

    # A free-tier response can report a zero billed cost. The dashboard's cost
    # view is a published market-value calculation, so retain a useful non-zero
    # value for the tokens actually consumed while preserving the source label.
    accrued = reported_cost if reported_cost > 0 else (
        input_tokens / 1_000_000 * input_rate
        + output_tokens / 1_000_000 * output_rate
    )
    _cost_ledger['input_tokens'] += input_tokens
    _cost_ledger['output_tokens'] += output_tokens
    _cost_ledger['total_accrued_usd'] += accrued
    _cost_ledger['request_count'] += 1
    _cost_ledger['input_rate_usd_per_million'] = input_rate
    _cost_ledger['output_rate_usd_per_million'] = output_rate
    _cost_ledger['last_synced'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    _cost_ledger['last_model'] = model_id
    _cost_ledger['last_usage_source'] = usage_source
    _save_cost_ledger()
    return {
        'input_tokens': input_tokens,
        'output_tokens': output_tokens,
        'cost_usd': accrued,
        'usage_source': usage_source,
    }


def get_cost_overview():
    """Return the cumulative usage this backend has recorded from the gateway."""
    has_usage = _cost_ledger['request_count'] > 0 and (
        _cost_ledger['input_tokens'] > 0 or _cost_ledger['output_tokens'] > 0
    )
    return {
        'ok': True,
        'has_usage': has_usage,
        'total_accrued': (
            f"{float(_cost_ledger['total_accrued_usd']):.8f}"
            if has_usage else None
        ),
        'input_token_price': (
            f"{float(_cost_ledger['input_rate_usd_per_million']):.8f} / 1M"
        ),
        'output_token_price': (
            f"{float(_cost_ledger['output_rate_usd_per_million']):.8f} / 1M"
        ),
        'input_tokens': _cost_ledger['input_tokens'],
        'output_tokens': _cost_ledger['output_tokens'],
        'request_count': _cost_ledger['request_count'],
        'last_synced': _cost_ledger['last_synced'],
        'last_model': _cost_ledger['last_model'],
        'usage_source': _cost_ledger['last_usage_source'],
    }

def _http_get_json(url, headers=None, timeout=10):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                return resp.status, json.loads(resp.read().decode('utf-8'))
            return resp.status, None
    except urllib.error.HTTPError as err:
        return err.code, None
    except Exception:
        return 0, None


def get_telemetry():
    global _cached_data, _last_poll_time
    now = time.time()
    if _cached_data is not None and (now - _last_poll_time) < CACHE_TTL:
        return _cached_data

    if psutil is not None:
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()
        per_cpu = psutil.cpu_percent(interval=None, percpu=True)
        cpu_pct = psutil.cpu_percent(interval=None)
        disk = psutil.disk_usage('/')
        ram_total = round(mem.total / (1024 * 1024))
        ram_used = round(mem.used / (1024 * 1024))
        ram_free = round(mem.available / (1024 * 1024))
        ram_pct = round(mem.percent, 1)
        swap_total = round(swap.total / (1024 * 1024))
        swap_used = round(swap.used / (1024 * 1024))
        swap_free = round(swap.free / (1024 * 1024))
        swap_pct = round(swap.percent, 1)
        cpu_p = round(cpu_pct, 1)
        cores = per_cpu if len(per_cpu) >= 2 else [cpu_p, cpu_p]
        disk_pct = round(disk.percent, 1)
    else:
        ram_total = ram_used = ram_free = swap_total = swap_used = swap_free = 0
        ram_pct = swap_pct = cpu_p = disk_pct = 0.0
        cores = [0.0, 0.0]

    # This is the BACKEND's own memory. nexus-dashboard.service is the Vite
    # preview server (a different process, ~45 MB), so querying it reported a
    # plausible-looking number for the wrong process.
    nexus_mem_mb = 0
    for svc in ('nexus-telemetry.service', 'nexus-dashboard'):
        try:
            res = subprocess.check_output(
                ['systemctl', '--user', 'show', svc, '--property=MemoryCurrent'],
                text=True, stderr=subprocess.DEVNULL, timeout=3)
        except Exception:
            continue
        # systemd returns "MemoryCurrent=[not set]" for a service that has not
        # been running; split('=')[1] would yield a non-digit and be skipped,
        # but guard the split itself so a value-less line cannot raise IndexError.
        val = res.strip().partition('=')[2]
        if val.isdigit():
            nexus_mem_mb = round(int(val) / (1024 * 1024), 1)
            break

    _cached_data = {
        'ram_total_mb': ram_total,
        'ram_used_mb': ram_used,
        'ram_free_mb': ram_free,
        'ram_percent': ram_pct,
        'swap_total_mb': swap_total,
        'swap_used_mb': swap_used,
        'swap_free_mb': swap_free,
        'swap_percent': swap_pct,
        'cpu_percent': cpu_p,
        'cpu_cores': cores,
        'disk_percent': disk_pct,
        'nexus_mem_mb': nexus_mem_mb
    }
    _last_poll_time = now
    return _cached_data


# --------------------------------------------------------------------------
# Hermes live gateway status + logs
#
# Both readers are read-only against files the Hermes gateway process owns.
# They are written for the stdlib HTTPServer below, which is SINGLE-THREADED:
# every route is serialised behind whichever handler is running. That makes
# the cost of these two readers a property of the whole dashboard, not just of
# this feature, so the two expensive parts are deliberately bounded:
#
#   1. config.yaml is 71KB and yaml.safe_load() on it measures ~1.3s here.
#      Running that per poll would stall /api/stats (2s cadence) and every
#      other route behind it. So the active-model read is a targeted top-level
#      `model:` block scan (~5ms) with the full parse kept only as a fallback.
#   2. gateway.log is ~3.5MB and growing. Reading it whole would move that
#      megabyte-scale cost onto every poll. Only the tail window is ever read.
#
# Results are cached with a short TTL so that a frontend polling faster than
# the files actually change cannot amplify either cost.
# --------------------------------------------------------------------------

HERMES_STATE_CACHE_TTL = 4.0    # heartbeat file: rewritten by the gateway anyway
HERMES_LOG_CACHE_TTL = 2.0      # tail window: cheaper to re-read than to lock

# ~64KB of tail covers several hundred log lines, which is far more than any
# poll needs, while keeping the read+parse cost in the low tens of ms.
HERMES_LOG_TAIL_BYTES = 64 * 1024
HERMES_LOG_DEFAULT_LIMIT = 60
HERMES_LOG_MAX_LIMIT = 300

# Only these names may be read, and each is resolved inside hermes_logs_dir().
# An allowlist rather than a join of caller input: `source` arrives from the
# query string, so an unchecked path would be a traversal into the filesystem.
HERMES_LOG_SOURCES = ('gateway', 'agent', 'errors')

_hermes_state_cache = {'at': 0.0, 'payload': None}
_hermes_model_cache = {'at': 0.0, 'payload': None}
_hermes_log_cache = {'at': 0.0, 'key': None, 'payload': None}


def _read_text(path, max_bytes):
    """Read at most `max_bytes` from the END of a text file.

    A tail read is what makes the log route cheap on a multi-megabyte file, but
    it also caps the damage from a pathological file: the read cannot be made
    larger by anything a caller sends.
    """
    try:
        with open(path, 'rb') as fh:
            fh.seek(0, os.SEEK_END)
            end = fh.tell()
            start = max(0, end - max_bytes)
            fh.seek(start)
            raw = fh.read()
    except OSError:
        return ''
    if start:
        # The window almost certainly starts mid-line; dropping the fragment
        # keeps a truncated timestamp from being reported as a real record.
        cut = raw.find(b'\n')
        raw = raw[cut + 1:] if cut != -1 else b''
    return raw.decode('utf-8', errors='replace')


def _hermes_model_block():
    """The `model:` section of config.yaml as a flat {key: value} map.

    Deliberately NOT yaml.safe_load(): that costs ~1.3s on this file, which on
    a single-threaded server is long enough to be felt as the whole dashboard
    stalling. This scans for the one top-level block it needs and is three
    orders of magnitude cheaper.

    Nested values keep their first line only. That is a real limitation and it
    is deliberate: every field this dashboard renders (default, provider,
    reasoning_effort, api_mode) is a scalar, and if the schema ever changes to
    nest them the fallback below parses the file properly instead.
    """
    try:
        with open(hermes_config_path(), 'r', encoding='utf-8', errors='replace') as fh:
            lines = fh.read().splitlines()
    except OSError:
        return {}

    block = {}
    inside = False
    for line in lines:
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        if not line[0].isspace():
            # A new top-level key ends the block. Matched exactly so that
            # neighbours like `model_catalog:` are not mistaken for `model:`.
            inside = line.rstrip() == 'model:'
            continue
        if inside and ':' in line:
            key, _, value = line.partition(':')
            block[key.strip()] = value.strip().strip('"\'')
    return block


def _hermes_active_model():
    """Currently configured active model for Hermes."""
    now = time.time()
    if _hermes_model_cache['payload'] is not None:
        if now - _hermes_model_cache['at'] < HERMES_STATE_CACHE_TTL * 5:
            return _hermes_model_cache['payload']

    model = _hermes_model_block()
    if not model.get('default'):
        # The scan came back empty. Parse it properly rather than reporting a
        # model that may well exist; this path is cached like the rest, so the
        # expensive fallback can only run on the slow path.
        try:
            if yaml is not None:
                with open(hermes_config_path(), 'r', encoding='utf-8') as fh:
                    cfg = yaml.safe_load(fh) or {}
                raw = cfg.get('model') or {}
                model = {k: v for k, v in raw.items() if not isinstance(v, (dict, list))}
            else:
                model = {}
        except Exception as exc:  # noqa: BLE001 - reported, never raised
            print(f'[hermes] model config read failed: {type(exc).__name__}: {exc}', flush=True)
            model = {}

    payload = {
        'id': model.get('default') or '',
        'provider': model.get('provider') or '',
        'reasoning_effort': model.get('reasoning_effort') or '',
        'api_mode': model.get('api_mode') or '',
        'base_url': model.get('base_url') or '',
        'supports_vision': str(model.get('supports_vision', '')).lower() == 'true',
    }
    _hermes_model_cache['at'] = now
    _hermes_model_cache['payload'] = payload
    return payload


def _hermes_platforms(raw):
    """Flatten gateway_state.json's platform map into a sorted, flat list.

    Total by construction. gateway_state.json is written by a separate process
    whose schema this server does not control, and a `platforms` value that is a
    list rather than a mapping used to raise AttributeError here - taking the
    whole status card down and returning a 500, which contradicts this module's
    documented contract that a corrupt source is reported as data, not as an
    HTTP error. Anything that is not a mapping is reported as no platforms
    rather than being allowed to escape.
    """
    out = []
    if not isinstance(raw, dict):
        return out
    for name, info in raw.items():
        if not isinstance(info, dict):
            # A platform described by a bare string is still worth surfacing;
            # one described by a number or null is not.
            if isinstance(info, str) and info:
                out.append({
                    'name': str(name),
                    'state': info,
                    'error_code': None,
                    'error_message': None,
                    'needs_attention': False,
                    'updated_at': None,
                })
            continue
        out.append({
            'name': str(name),
            'state': info.get('state') or 'unknown',
            'error_code': info.get('error_code'),
            'error_message': info.get('error_message'),
            'needs_attention': bool(info.get('needs_attention')),
            'updated_at': info.get('updated_at'),
        })
    out.sort(key=lambda p: p['name'])
    return out


def get_hermes_status():
    """Live Hermes gateway state + active model config.

    Reads two files the gateway owns: the heartbeat (gateway_state.json) and
    the agent config (config.yaml). Never raises - a missing or corrupt source
    is reported as data (`available: False` plus the reason), because a
    gateway that is merely stopped is a normal state the UI has to render, not
    an HTTP error.
    """
    now = time.time()
    cached = _hermes_state_cache['payload']
    if cached is not None and now - _hermes_state_cache['at'] < HERMES_STATE_CACHE_TTL:
        return cached

    state = {}
    state_error = None
    try:
        with open(hermes_gateway_state_path(), 'r', encoding='utf-8') as fh:
            state = json.load(fh) or {}
    except FileNotFoundError:
        state_error = 'gateway_state.json not found - gateway has never started'
    except Exception as exc:  # noqa: BLE001
        state_error = f'{type(exc).__name__}: {exc}'

    pid = state.get('pid')
    alive = False
    uptime_sec = None
    process = None
    if isinstance(pid, int):
        if psutil is not None:
            try:
                proc = psutil.Process(pid)
                proc.create_time()          # raises if the pid was recycled
                alive = proc.is_running() and proc.status() != psutil.STATUS_ZOMBIE
                if alive:
                    uptime_sec = max(0, int(now - proc.create_time()))
                    with proc.oneshot():
                        process = {'name': proc.name(), 'status': proc.status()}
            except psutil.NoSuchProcess:
                alive = False
            except psutil.AccessDenied:
                # The pid exists but is not ours to inspect. Reporting it dead
                # would be a lie, so it stays alive with an unknown uptime.
                alive = True
        else:
            try:
                os.kill(pid, 0)
                alive = True
            except OSError:
                alive = False

    payload = {
        'ok': True,
        'available': bool(state),
        'state': state.get('gateway_state') or ('running' if alive else 'unknown'),
        'pid': pid if isinstance(pid, int) else None,
        'alive': alive,
        'uptime_sec': uptime_sec,
        'code_version': state.get('code_version') or '',
        'code_sha': state.get('code_sha') or '',
        'active_agents': state.get('active_agents'),
        'active_work': state.get('active_work'),
        'session_store': (state.get('session_store') or {}).get('status', ''),
        'served_profiles': list(state.get('served_profiles') or []),
        'platforms': _hermes_platforms(state.get('platforms')),
        'updated_at': state.get('updated_at'),
        'process': process,
        'model': _hermes_active_model(),
        'state_error': state_error,
        'read_at': now,
    }
    _hermes_state_cache['at'] = now
    _hermes_state_cache['payload'] = payload
    return payload


def build_console_log_entries(limit='500', level='all'):
    """Flatten both read paths into the console viewer's entry shape.

    The ported viewer expects a bare JSON array of
    {timestamp, level, component, message} — no envelope, no wrapper object.
    Both inputs are existing read-only readers: the Hermes log tail and the
    call ledger. Nothing here writes.

    `level` is a progressive floor, matching the viewer's "Warn+" semantics:
    warn shows warn and everything worse.
    """
    try:
        limit = max(1, min(int(limit), 2000))
    except (TypeError, ValueError):
        limit = 500

    ranks = {'debug': 4, 'info': 3, 'warn': 2, 'error': 1, 'fatal': 0}
    floor = ranks.get(str(level or 'all').lower(), -1)

    def rank_of(name):
        n = str(name or 'info').strip().lower()
        if n in ('warning',):
            n = 'warn'
        if n == 'critical':
            n = 'fatal'
        if n == 'trace':
            n = 'debug'
        return ranks.get(n, 3)

    entries = []

    # Hermes side.
    try:
        payload = get_hermes_logs(limit=limit, source='gateway', profile=None)
        for row in (payload.get('logs') or []):
            entries.append({
                'timestamp': str(row.get('time') or ''),
                'level': str(row.get('level') or 'info'),
                'component': str(row.get('logger') or 'gateway'),
                'message': str(row.get('message') or ''),
            })
    except Exception as exc:  # noqa: BLE001
        print(f'[console] hermes read failed: {type(exc).__name__}: {exc}', flush=True)

    # Call-ledger side. The reader is optional — a host without it still gets
    # the gateway half of the stream rather than a 500.
    try:
        if omniroute_logs is not None:
            detail = omniroute_logs.read_call_logs(limit, 0)
            for c in (detail.get('calls') or []):
                code = c.get('status')
                if code == 429:
                    lvl = 'warn'
                elif c.get('ok') is False:
                    lvl = 'error'
                elif isinstance(code, int) and code >= 400:
                    lvl = 'error'
                else:
                    lvl = 'info'
                bits = [f"{c.get('method') or 'POST'} {c.get('path') or ''}".strip(), c.get('model') or '']
                entries.append({
                    'timestamp': str(c.get('at') or ''),
                    'level': lvl,
                    'component': str(c.get('provider') or 'router'),
                    'message': ' '.join(b for b in bits if b),
                })
    except Exception as exc:  # noqa: BLE001
        print(f'[console] call-ledger read failed: {type(exc).__name__}: {exc}', flush=True)

    if floor >= 0:
        entries = [e for e in entries if rank_of(e['level']) <= floor]

    # Newest first: the viewer auto-scrolls to the bottom, so the tail must be
    # the last row rather than the first.
    def sort_key(e):
        try:
            return (0, -time.mktime(time.strptime(e['timestamp'][:19], '%Y-%m-%d %H:%M:%S')))
        except Exception:
            return (1, 0)

    entries.sort(key=sort_key)
    return entries[:limit]


def get_hermes_logs(limit=HERMES_LOG_DEFAULT_LIMIT, source='gateway', profile=None):
    """Tail of a Hermes log file, parsed into display records.

    Chronological (oldest first) so the frontend can append like a terminal.

    `source` is checked against HERMES_LOG_SOURCES rather than joined onto the
    logs directory, because it comes straight off the query string.

    `profile` narrows the feed to one served profile and is resolved through
    `_safe_hermes_profile`, never joined raw: it also reaches the filesystem.

    Two independent sources, and which one wins is reported, not hidden
    ---------------------------------------------------------------
    A profile that runs as its own process writes a complete log of its own under
    ~/.hermes/profiles/<name>/logs/. That file is the authoritative record for
    that profile and is always preferred when it exists - measured on this
    machine it holds ~9x the records of the shared log carries for the same
    profile.

    When a profile has no log directory of its own, the shared log is the only
    record there is, so it is read and filtered by the profile marker the gateway
    writes. `profile_source` reports which of the two happened, because a filter
    that silently falls back from a rich per-profile file to a sparse marker
    match would otherwise look like the profile has almost no activity.
    """
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = HERMES_LOG_DEFAULT_LIMIT
    limit = max(1, min(limit, HERMES_LOG_MAX_LIMIT))

    source = str(source or 'gateway').strip().lower()
    if source not in HERMES_LOG_SOURCES:
        source = 'gateway'

    safe_profile = _safe_hermes_profile(profile)

    # A profile was asked for but did not survive validation. Answering with every
    # profile's traffic here would be indistinguishable, in the UI, from a filter
    # that worked - so the rejection is reported instead of silently ignored.
    if _hermes_profile_rejected(profile):
        payload = {
            'ok': True,
            'source': source,
            'profile': None,
            'profile_requested': str(profile).strip(),
            'profile_source': 'rejected',
            'count': 0,
            'logs': [],
            'error': _HERMES_PROFILE_REJECTED,
            'read_at': time.time(),
        }
        return payload

    now = time.time()
    cache_key = (source, limit, safe_profile)
    cached = _hermes_log_cache['payload']
    if cached is not None and _hermes_log_cache['key'] == cache_key:
        if now - _hermes_log_cache['at'] < HERMES_LOG_CACHE_TTL:
            return cached

    records, reason, profile_source = _read_hermes_log_records(source, safe_profile)
    # The tail window is a byte budget, not a line budget, so trimming to the
    # newest `limit` records has to happen after parsing rather than before.
    records = records[-limit:]

    payload = {
        'ok': True,
        'source': source,
        'profile': safe_profile,
        'profile_requested': str(profile).strip() if profile is not None else None,
        'profile_source': profile_source,
        'count': len(records),
        'logs': records,
        'error': reason,
        'read_at': now,
    }
    _hermes_log_cache['at'] = now
    _hermes_log_cache['key'] = cache_key
    _hermes_log_cache['payload'] = payload
    return payload


# The shared gateway attributes a line to a profile with a trailing
# '(profile: <name>)' marker. This is the only place a shared log line is
# attributable to one profile, and it is written by the gateway itself rather
# than inferred here.
_PROFILE_MARKER_RE = re.compile(r'\(profile:\s*([A-Za-z0-9][A-Za-z0-9._-]{0,63})\s*\)')

# A profile name is used as a path segment, so it is allowlisted by shape and
# then confined by real path. The leading-alphanumeric requirement alone rejects
# '.', '..' and every hidden/dotfile name; the confinement catches whatever the
# shape check missed, including a symlink pointing out of the tree.
_HERMES_PROFILE_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$')

# Distinguishes "no profile requested" from "a profile was requested but did not
# survive validation". The first is a normal unfiltered read; the second is a
# client mistake and is reported rather than quietly answered with every profile.
_HERMES_PROFILE_REJECTED = 'profile name is not a valid Hermes profile'


def _safe_hermes_profile(profile):
    """A profile name that is safe to use as a path segment, or None.

    Returns the bare string for a usable name and None for anything else,
    including an absent one. Callers distinguish the two cases with
    `_hermes_profile_rejected()`, because both produce None here.
    """
    if profile is None:
        return None
    candidate = str(profile).strip()
    if not candidate:
        return None
    if not _HERMES_PROFILE_RE.match(candidate):
        return None

    root = os.path.realpath(hermes_profiles_dir())
    resolved = os.path.realpath(hermes_profile_logs_dir(candidate))
    if resolved != root and not resolved.startswith(root + os.sep):
        return None
    return candidate


def _hermes_profile_rejected(profile):
    """True when a profile was asked for but could not be validated."""
    return profile is not None and not str(profile).strip() == '' and _safe_hermes_profile(profile) is None


def _line_matches_profile(line, profile):
    """Does one shared-log line belong to `profile`?

    Two cases, both positive claims rather than guesses:

      - The line carries the gateway's own '(profile: <name>)' marker. It belongs
        to exactly that profile, whatever else is in the file.
      - The line carries no profile marker at all. It belongs to the profile whose
        own log directory IS the shared directory, which is `default`. Attributing
        an unattributed shared line to any other profile would be a guess.

    A marker naming a DIFFERENT profile matches neither case, which is the point:
    those lines are the shared gateway reporting on someone else's profile.
    """
    match = _PROFILE_MARKER_RE.search(line)
    if match:
        return match.group(1) == profile
    return profile == HERMES_DEFAULT_PROFILE


# `default` is the profile whose logs are the shared logs. It is the one name with
# no subdirectory under ~/.hermes/profiles, so it is defined here rather than
# discovered from the filesystem.
HERMES_DEFAULT_PROFILE = 'default'


def _read_hermes_log_records(source, profile):
    """Parse the right log file for `profile`. Returns (records, reason, origin).

    `origin` is 'profile-dir' when the profile's own log file was read, 'shared'
    when the shared log was filtered by profile marker instead, and None when no
    profile was requested at all.
    """
    records = []
    if profile is None:
        path = os.path.join(hermes_logs_dir(), f'{source}.log')
        text = _read_text(path, HERMES_LOG_TAIL_BYTES)
        records = _parse_log_records(text, None)
        return records, _log_reason(path, text), None

    # The profile's own log directory, when this profile actually has one.
    own_path = os.path.join(hermes_profile_logs_dir(profile), f'{source}.log')
    if os.path.exists(own_path):
        text = _read_text(own_path, HERMES_LOG_TAIL_BYTES)
        records = _parse_log_records(text, None)
        reason = _log_reason(own_path, text)
        # A per-profile log that exists but is empty is a real state ("this
        # profile is not writing anything yet"), not a reason to fall through to
        # the shared marker match and quietly show another profile's traffic.
        return records, reason, 'profile-dir'

    shared_path = os.path.join(hermes_logs_dir(), f'{source}.log')
    text = _read_text(shared_path, HERMES_LOG_TAIL_BYTES)
    records = _parse_log_records(text, profile)
    reason = _log_reason(shared_path, text)
    if not records and not reason:
        # The shared log was read and matched nothing for this profile. Say which
        # file was consulted so an empty feed is distinguishable from a filter
        # that was never applied.
        reason = f'no {source}.log records tagged (profile: {profile})'
    return records, reason, 'shared'


def _parse_log_records(text, profile=None):
    """Parse a tail window into display records, newest last.

    `profile` is applied to the RAW line, before parsing: the '(profile: x)'
    marker is written into the message body, so filtering after parsing would
    work but filtering here keeps `_parse_log_line` the single owner of what
    counts as a record.
    """
    out = []
    for line in text.splitlines():
        if profile is not None and not _line_matches_profile(line, profile):
            continue
        parsed = _parse_log_line(line)
        if parsed:
            out.append(parsed)
    return out


def _log_reason(path, text):
    """The 'why is this feed empty' string, or None when there is genuinely data."""
    if text:
        return None
    return f'{os.path.basename(path)} is empty or unreadable' if os.path.exists(path) \
        else f'{os.path.basename(path)} not found'


def _parse_log_line(line):
    """'2026-10-07 02:44:35,209 INFO gateway.run: response ready'
       -> {time, level, logger, message}

    Returns None for anything that does not match, so interleaved continuation
    lines and tracebacks are dropped instead of being shown as garbage records.

    The timestamp is positional: Hermes writes Python logging's default
    '%Y-%m-%d %H:%M:%S', optionally followed by ',%f' milliseconds and a single
    space. Both the millisecond comma and the separator space are checked, so a
    line without milliseconds cannot be mis-sliced by the offset that assumes
    them.
    """
    # Shortest possible line is 19 timestamp chars + ' LEVEL' + ' x: y'.
    if not line or len(line) < 28:
        return None
    # Cheap shape check: digit, '-', digit, '-', digit.
    if line[4] != '-' or line[7] != '-':
        return None

    if line[19] == ',' and line[23] == ' ':
        stamp_len = 23
    elif line[19] == ' ':
        stamp_len = 19
    else:
        return None

    rest_of_line = line[stamp_len:]
    # Exactly one separating space, present in both timestamp forms. Skipping it
    # explicitly is what keeps `partition(' ')` from returning an empty level.
    if rest_of_line.startswith(' '):
        rest_of_line = rest_of_line[1:]
    level, sep, rest = rest_of_line.partition(' ')
    if not sep:
        return None
    level = level.strip().upper()
    if level == 'WARN':
        level = 'WARNING'
    if level not in ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'):
        return None

    logger, _, message = rest.partition(':')
    return {
        'time': line[:stamp_len],
        'level': level,
        'logger': logger.strip(),
        'message': message.strip() or rest.strip(),
    }


def get_hermes_config_providers():
    global _cached_providers, _last_provider_time
    now = time.time()
    if _cached_providers is not None and (now - _last_provider_time) < PROVIDER_CACHE_TTL:
        return _cached_providers

    config_path = hermes_config_path()
    try:
        if yaml is not None:
            with open(config_path, 'r') as f:
                cfg = yaml.safe_load(f) or {}
        else:
            cfg = {}
    except Exception as e:
        cfg = {}

    providers_raw = cfg.get('providers', {})
    result_providers = []

    # Process NVIDIA provider specifically
    if 'nvidia' in providers_raw:
        n_cfg = providers_raw['nvidia']
        api_key = n_cfg.get('api_key')
        base_url = n_cfg.get('base_url', 'https://integrate.api.nvidia.com/v1')
        enabled = n_cfg.get('enabled', True)
        configured_models = n_cfg.get('models', [])

        models_list = []
        api_status = 'Healthy'
        rate_limit_info = 'Free Tier (40 RPM limit)'

        # Fetch live models from NVIDIA API
        try:
            headers = {'Authorization': f'Bearer {api_key}'} if api_key else {}
            if requests is not None:
                resp = requests.get(f'{base_url}/models', headers=headers, timeout=8)
                code = resp.status_code
                data = resp.json().get('data', []) if code == 200 else []
            else:
                code, res_json = _http_get_json(f'{base_url}/models', headers=headers, timeout=8)
                data = (res_json or {}).get('data', []) if code == 200 else []
            if code == 200:
                for item in data:
                    mid = item.get('id', '')
                    mname = mid.split('/')[-1].replace('-', ' ').title() if '/' in mid else mid
                    mid_lower = mid.lower()

                    # Filter: Daily Use vs Specialized Non-Daily
                    scope = 'daily'
                    specialized_tag = None
                    host_type = 'Cloud API'

                    # Detect specific modal execution endpoints for backend repair/agent inspection
                    if any(k in mid_lower for k in ['embed', 'retriever', 'clip']):
                        cat = 'embedding'
                        endpoint_route = '/v1/embeddings'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['diffusion', 'sdxl', 'flux', 'sana']):
                        cat = 'image-gen'
                        endpoint_route = '/v1/genai/image/generations'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['vision', 'fuyu', 'kosmos', 'neva', 'vila', '-vl-', 'vlm', 'paligemma']):
                        cat = 'vision'
                        endpoint_route = '/v1/chat/completions'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['tts', 'voice', 'speech', 'audio']):
                        cat = 'tts'
                        endpoint_route = '/v1/audio/speech'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['stt', 'whisper', 'transcribe', 'asr', 'riva-translate', 'translate']):
                        cat = 'stt'
                        endpoint_route = '/v1/audio/transcriptions'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['med', 'drug', 'bio', 'molecule']):
                        scope = 'specialized'
                        cat = 'specialized'
                        specialized_tag = 'Biomedical / Healthcare'
                        endpoint_route = '/v1/chat/completions'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['synthetic-video', 'detector']):
                        scope = 'specialized'
                        cat = 'specialized'
                        specialized_tag = 'Forensics / Detection'
                        endpoint_route = '/v1/cv/synthetic-video-detection'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['route', 'weather', 'simulation', 'calibration']):
                        scope = 'specialized'
                        cat = 'specialized'
                        specialized_tag = 'Physics & Simulation'
                        endpoint_route = '/v1/physics/simulation'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['robot', 'isaac', 'arm', 'spatial']):
                        scope = 'specialized'
                        cat = 'specialized'
                        specialized_tag = 'Robotics & Embodied AI'
                        endpoint_route = '/v1/robotics/spatial-action'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['guard', 'safety', 'reward']):
                        scope = 'specialized'
                        cat = 'specialized'
                        specialized_tag = 'Safety Guardrail'
                        endpoint_route = '/v1/chat/completions'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['parse', 'ocr', 'deplot']):
                        scope = 'specialized'
                        cat = 'specialized'
                        specialized_tag = 'Doc / OCR Parsing'
                        endpoint_route = '/v1/chat/completions'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['reason', 'dbrx', 'thinking']):
                        cat = 'decision'
                        endpoint_route = '/v1/chat/completions'
                        request_method = 'POST'
                    else:
                        cat = 'text' # Core LLM
                        endpoint_route = '/v1/chat/completions'
                        request_method = 'POST'

                    is_active = mid in configured_models or len(configured_models) == 0

                    models_list.append({
                        'id': mid,
                        'name': mname,
                        'category': cat,
                        'scope': scope,
                        'specialized_tag': specialized_tag,
                        'host_type': host_type,
                        'provider': 'NVIDIA NIM',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active' if is_active else 'Available',
                        'configured_in_hermes': mid in configured_models,
                        'context': {
                            'original': 'Up to 128k',
                            'system': 'NVIDIA NIM Hosted'
                        },
                        'description': f'Official NVIDIA NIM model: {mid}',
                        # Hidden technical metadata for autonomous agents / backend diagnostic scripts
                        '__technical_agent_manifest__': {
                            'full_endpoint_url': f'{base_url.rstrip("/")}{endpoint_route}',
                            'route': endpoint_route,
                            'method': request_method,
                            'auth_type': 'Bearer API Key',
                            'headers': {'Authorization': 'Bearer [HERMES_ENV_NVIDIA_API_KEY]'},
                            'upstream_provider': 'NVIDIA Cloud Functions (NVCF)',
                            'cli_compatible': True,
                            'payload_schema': 'openai_compatible_json'
                        }
                    })

                # Dedicated Visual GenAI Models (Text-to-Image & Video Generation) from NVIDIA Catalog
                visual_genai_models = [
                    {
                        'id': 'stabilityai/stable-diffusion-3.5-large',
                        'name': 'Stable Diffusion 3.5 Large',
                        'category': 'image-gen',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud NIM API',
                        'provider': 'Stability AI (NVIDIA NIM)',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': '1024x1024 Native', 'system': 'Multi-Prompt Diffusion'},
                        'description': 'Popular text-to-image 8B parameter foundation model with high quality photorealistic generation.',
                        '__technical_agent_manifest__': {
                            'full_endpoint_url': 'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3_5-large',
                            'route': '/v1/genai/stabilityai/stable-diffusion-3_5-large',
                            'method': 'POST',
                            'auth_type': 'Bearer API Key',
                            'headers': {'Authorization': 'Bearer [HERMES_ENV_NVIDIA_API_KEY]'},
                            'upstream_provider': 'NVIDIA NIM Visual GenAI',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/stabilityai/stable-diffusion-3_5-large'
                        }
                    },
                    {
                        'id': 'stabilityai/stable-diffusion-xl',
                        'name': 'Stable Diffusion XL',
                        'category': 'image-gen',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud NIM API',
                        'provider': 'Stability AI (NVIDIA NIM)',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': '1024x1024 Native', 'system': 'SDXL Latent Diffusion'},
                        'description': 'High-performance text-to-image generative model producing realistic aesthetics and typography.',
                        '__technical_agent_manifest__': {
                            'full_endpoint_url': 'https://ai.api.nvidia.com/v1/genai/stabilityai/sdxl',
                            'route': '/v1/genai/stabilityai/sdxl',
                            'method': 'POST',
                            'auth_type': 'Bearer API Key',
                            'headers': {'Authorization': 'Bearer [HERMES_ENV_NVIDIA_API_KEY]'},
                            'upstream_provider': 'NVIDIA NIM Visual GenAI',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/stabilityai/stable-diffusion-xl'
                        }
                    },
                    {
                        'id': 'qwen/qwen-image',
                        'name': 'Qwen-Image Text-to-Image',
                        'category': 'image-gen',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud NIM API & Local Container',
                        'provider': 'Qwen (NVIDIA NIM)',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': 'Multilingual Text', 'system': 'Vision-Language Diffusion'},
                        'description': 'Text-to-image foundation model with state-of-the-art multilingual text rendering in images.',
                        '__technical_agent_manifest__': {
                            'full_endpoint_url': 'https://ai.api.nvidia.com/v1/genai/qwen/qwen-image',
                            'route': '/v1/genai/qwen/qwen-image',
                            'method': 'POST',
                            'auth_type': 'Bearer API Key',
                            'headers': {'Authorization': 'Bearer [HERMES_ENV_NVIDIA_API_KEY]'},
                            'upstream_provider': 'NVIDIA NIM Visual GenAI',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/qwen/qwen-image'
                        }
                    },
                    {
                        'id': 'stabilityai/stable-video-diffusion',
                        'name': 'Stable Video Diffusion (SVD)',
                        'category': 'video',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud NIM API',
                        'provider': 'Stability AI (NVIDIA NIM)',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': 'Image-to-Video', 'system': '14/25 Frame Diffusion'},
                        'description': 'Generative video diffusion model synthesizing dynamic video sequences from conditioning still images.',
                        '__technical_agent_manifest__': {
                            'full_endpoint_url': 'https://ai.api.nvidia.com/v1/video/stabilityai/stable-video-diffusion',
                            'route': '/v1/video/stabilityai/stable-video-diffusion',
                            'method': 'POST',
                            'auth_type': 'Bearer API Key',
                            'headers': {'Authorization': 'Bearer [HERMES_ENV_NVIDIA_API_KEY]'},
                            'upstream_provider': 'NVIDIA NIM Visual GenAI',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/stabilityai/stable-video-diffusion'
                        }
                    }
                ]

                # Speech Models from NVIDIA Riva NIM catalog with verified local vs cloud host types & exact NVCF gRPC IDs
                speech_models = [
                    {
                        'id': 'nvidia/magpie-tts-multilingual',
                        'name': 'Magpie TTS Multilingual',
                        'category': 'tts',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud API & Local NGC NIM',
                        'provider': 'NVIDIA Riva NIM',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': 'Native Audio', 'system': 'Riva Streaming'},
                        'description': 'Real-time neural speech synthesis pipeline optimized for natural conversational agents.',
                        '__technical_agent_manifest__': {
                            'protocol': 'gRPC over TLS',
                            'grpc_server': 'grpc.nvcf.nvidia.com:443',
                            'nvcf_function_id': '877104f7-e885-42b9-8de8-f6e4c6303969',
                            'client_library': 'nvidia-riva-client',
                            'pip_install': 'pip install nvidia-riva-client',
                            'git_repo': 'https://github.com/nvidia-riva/python-clients.git',
                            'cli_command': 'python python-clients/scripts/tts/talk.py --server grpc.nvcf.nvidia.com:443 --use-ssl --metadata function-id "877104f7-e885-42b9-8de8-f6e4c6303969" --metadata "authorization" "Bearer $NVIDIA_API_KEY" --text "Hello from Alya"',
                            'upstream_provider': 'NVIDIA Riva NVCF',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/nvidia/magpie-tts-multilingual/api'
                        }
                    },
                    {
                        'id': 'nvidia/chatterbox-multilingual-tts',
                        'name': 'Chatterbox Multilingual TTS',
                        'category': 'tts',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Local NGC Container (Local Run Required)',
                        'provider': 'NVIDIA Riva NIM',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Local',
                        'output_pricing': '$0.00 / Local',
                        'rate_limit': 'Local Hardware',
                        'status': 'Downloadable / Local',
                        'configured_in_hermes': False,
                        'context': {'original': 'Local GPU/CPU', 'system': 'NGC Container'},
                        'description': 'High-fidelity multilingual speech synthesis designed for on-premise local Docker/NIM deployment.',
                        '__technical_agent_manifest__': {
                            'protocol': 'gRPC / Docker Container',
                            'grpc_server': 'grpc.nvcf.nvidia.com:443 (or localhost:50051)',
                            'nvcf_function_id': 'ddacc747-1269-4fab-bfd9-8f593dead106',
                            'client_library': 'nvidia-riva-client',
                            'pip_install': 'pip install nvidia-riva-client',
                            'git_repo': 'https://github.com/nvidia-riva/python-clients.git',
                            'cli_command': 'python python-clients/scripts/tts/talk.py --server grpc.nvcf.nvidia.com:443 --use-ssl --metadata function-id "ddacc747-1269-4fab-bfd9-8f593dead106" --metadata "authorization" "Bearer $NVIDIA_API_KEY"',
                            'upstream_provider': 'NGC Docker Container / NVCF',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/nvidia/chatterbox-multilingual-tts/api'
                        }
                    },
                    {
                        'id': 'nvidia/parakeet-ctc-0.6b-asr',
                        'name': 'Parakeet CTC 0.6B ASR',
                        'category': 'stt',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud API & Local NGC NIM',
                        'provider': 'NVIDIA Riva NIM',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': '16-bit Mono WAV', 'system': 'Riva Conformer'},
                        'description': 'State-of-the-art accuracy and speed for English transcriptions with timestamped output.',
                        '__technical_agent_manifest__': {
                            'protocol': 'gRPC over TLS',
                            'grpc_server': 'grpc.nvcf.nvidia.com:443',
                            'nvcf_function_id': 'd8dd4e9b-fbf5-4fb0-9dba-8cf436c8d965',
                            'client_library': 'nvidia-riva-client',
                            'pip_install': 'pip install nvidia-riva-client',
                            'git_repo': 'https://github.com/nvidia-riva/python-clients.git',
                            'cli_command': 'python python-clients/scripts/asr/transcribe_file.py --server grpc.nvcf.nvidia.com:443 --use-ssl --metadata function-id "d8dd4e9b-fbf5-4fb0-9dba-8cf436c8d965" --metadata "authorization" "Bearer $NVIDIA_API_KEY" --language-code en-US --input-file <audio.wav>',
                            'upstream_provider': 'NVIDIA Riva NVCF',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/nvidia/parakeet-ctc-0_6b-asr/api'
                        }
                    },
                    {
                        'id': 'nvidia/parakeet-tdt-0.6b-v2',
                        'name': 'Parakeet TDT 0.6B v2',
                        'category': 'stt',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud API & Local NGC NIM',
                        'provider': 'NVIDIA Riva NIM',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': '30s chunking', 'system': '6.05% WER'},
                        'description': 'State-of-the-art fast conformer automatic speech recognition with 3386x real-time factor.',
                        '__technical_agent_manifest__': {
                            'protocol': 'gRPC over TLS',
                            'grpc_server': 'grpc.nvcf.nvidia.com:443',
                            'nvcf_function_id': 'd3fe9151-442b-4204-a70d-5fcc597fd610',
                            'client_library': 'nvidia-riva-client',
                            'pip_install': 'pip install nvidia-riva-client',
                            'git_repo': 'https://github.com/nvidia-riva/python-clients.git',
                            'cli_command': 'python python-clients/scripts/asr/transcribe_file.py --server grpc.nvcf.nvidia.com:443 --use-ssl --metadata function-id "d3fe9151-442b-4204-a70d-5fcc597fd610" --metadata "authorization" "Bearer $NVIDIA_API_KEY" --language-code en-US --input-file <audio.wav>',
                            'upstream_provider': 'NVIDIA Riva NVCF',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/nvidia/parakeet-tdt-0_6b-v2/api'
                        }
                    },
                    {
                        'id': 'nvidia/canary-1b-asr',
                        'name': 'Canary 1B Multilingual ASR',
                        'category': 'stt',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud API & Local NGC NIM',
                        'provider': 'NVIDIA Riva NIM',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': '30s chunking', 'system': 'Multilingual ASR'},
                        'description': 'Top-tier multi-lingual speech-to-text recognition and real-time audio translation.',
                        '__technical_agent_manifest__': {
                            'protocol': 'gRPC over TLS',
                            'grpc_server': 'grpc.nvcf.nvidia.com:443',
                            'nvcf_function_id': 'b0e8b4a5-217c-40b7-9b96-17d84e666317',
                            'client_library': 'nvidia-riva-client',
                            'pip_install': 'pip install nvidia-riva-client',
                            'git_repo': 'https://github.com/nvidia-riva/python-clients.git',
                            'cli_command': 'python python-clients/scripts/asr/transcribe_file.py --server grpc.nvcf.nvidia.com:443 --use-ssl --metadata function-id "b0e8b4a5-217c-40b7-9b96-17d84e666317" --metadata "authorization" "Bearer $NVIDIA_API_KEY" --language-code en-US --input-file <audio.wav>',
                            'upstream_provider': 'NVIDIA Riva NVCF',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/nvidia/canary-1b-asr/api'
                        }
                    }
                ]
                # Dedup against what models_list already holds. This used to reference an
                # undefined name, raising NameError and taking the whole NVIDIA
                # provider down with it.
                for vm in visual_genai_models:
                    if not any(m['id'] == vm['id'] for m in models_list):
                        models_list.append(vm)

                for sm in speech_models:
                    if not any(m['id'] == sm['id'] for m in models_list):
                        models_list.append(sm)
            else:
                api_status = f'HTTP {resp.status_code}'
        except Exception as e:
            api_status = 'Unavailable'

        # ---- Auto-hide retired models (live health sync) ----
        health = model_health.get_health_map() if model_health else None
        if health:
            before = len(models_list)
            hidden_ids = []
            kept = []
            for m in models_list:
                st = health.get(m['id'])
                if st == 'RETIRED':
                    hidden_ids.append(m['id'])
                    continue
                kept.append(m)
            models_list = kept
            if hidden_ids:
                print('[health] hid {} retired model(s): {}'.format(
                    len(hidden_ids), ', '.join(hidden_ids[:6]) +
                    (' ...' if len(hidden_ids) > 6 else '')))

        daily_models = [m for m in models_list if m.get('scope') == 'daily']
        spec_models = [m for m in models_list if m.get('scope') == 'specialized']

        result_providers.append({
            'id': 'nvidia',
            'name': 'NVIDIA NIM',
            'display_name': 'NVIDIA AI Foundation & NIM',
            'logo': '/agent-logos/nvidia.svg',
            'status': api_status,
            'enabled': enabled,
            'rate_limit': rate_limit_info,
            'base_url': base_url,
            'website_url': 'https://build.nvidia.com/models',
            'total_models': len(models_list),
            'daily_count': len(daily_models),
            'specialized_count': len(spec_models),
            'models': models_list,
            'categories': {
                'text': len([m for m in daily_models if m['category'] == 'text']),
                'vision': len([m for m in daily_models if m['category'] == 'vision']),
                'image_gen': len([m for m in daily_models if m['category'] == 'image-gen']),
                'video': len([m for m in daily_models if m['category'] == 'video']),
                'tts': len([m for m in daily_models if m['category'] == 'tts']),
                'stt': len([m for m in daily_models if m['category'] == 'stt']),
                'embedding': len([m for m in daily_models if m['category'] == 'embedding']),
                'decision': len([m for m in daily_models if m['category'] == 'decision']),
                'specialized': len(spec_models)
            }
        })

    _cached_providers = result_providers
    _last_provider_time = now
    return _cached_providers


_LOGO_HINTS = {
    'deepseek': 'deepseek', 'nvidia': 'nvidia', 'google': 'google',
    'gemini': 'google', 'mistralai': 'mistral', 'qwen': 'qwen',
    'stabilityai': 'stability', 'meta': 'meta', 'moonshotai': 'moonshot',
}


def _logo_for(pid):
    """Return a /logos path only when a real asset exists, else None."""
    cands = []
    if pid in _LOGO_HINTS:
        cands.append(_LOGO_HINTS[pid])
    cands.append(pid)
    base = os.path.dirname(os.path.abspath(__file__))
    for c in cands:
        for ext in ('.svg', '.png'):
            if os.path.exists(os.path.join(base, 'public', 'logos', c + ext)):
                return '/logos/{}{}'.format(c, ext)
    return None


def get_all_config_providers():
    """Every provider in the Hermes config (routers included, marked as such)."""
    try:
        if yaml is not None:
            with open(hermes_config_path(), 'r') as f:
                cfg = yaml.safe_load(f) or {}
        else:
            cfg = {}
    except Exception:
        cfg = {}

    providers_raw = cfg.get('providers', {}) or {}
    out = []
    for pid, p in (providers_raw or {}).items():
        if not isinstance(p, dict):
            continue
        base = p.get('base_url') or ''
        is_router = any(k in str(base).lower() or k in pid.lower()
                        for k in ('router', 'rout.my', 'literouter', 'apmix',
                                  'freetheai', 'tokenrouter', 'blazeapi', 'crax'))
        models = p.get('models') or {}
        n_models = len(models) if isinstance(models, (dict, list)) else 0
        real_url = base or _KNOWN_BASE_URLS.get(pid, 'https://api.' + pid + '.com/v1')
        out.append({
            'id': pid,
            'name': p.get('display_name') or pid.title(),
            'base_url': real_url,
            'website_url': real_url,
            'enabled': p.get('enabled', True),
            'model_count': n_models,
            'discover_models': p.get('discover_models', True),
            'kind': 'router' if is_router else 'direct',
            'logo': (_logo_for(pid) if not is_router else None),
        })
    out.sort(key=lambda x: (x['kind'] != 'direct', -x['model_count']))
    return out




# config provider id -> (gateway prefixes, model-id substring that must match)
# A prefix alone is far too coarse: pointing deepseek at "nvidia" handed the
# card all 65 NVIDIA Nemotron models under a DeepSeek heading. The second
# element filters the borrowed models to ones the brand actually serves.
_KNOWN_BASE_URLS = {
    'anthropic': 'https://api.anthropic.com/v1',
    'openai': 'https://api.openai.com/v1',
    'deepseek': 'https://api.deepseek.com/v1',
    'google': 'https://generativelanguage.googleapis.com/v1beta',
    'gemini': 'https://generativelanguage.googleapis.com/v1beta',
    'groq': 'https://api.groq.com/openai/v1',
    'openrouter': 'https://openrouter.ai/api/v1',
    'mistral': 'https://api.mistral.ai/v1',
    'mistralai': 'https://api.mistral.ai/v1',
    'nvidia': 'https://integrate.api.nvidia.com/v1',
    'qwencloud': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'qwen-cloud': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'cerebras': 'https://api.cerebras.ai/v1',
    'together': 'https://api.together.xyz/v1',
    'cohere': 'https://api.cohere.com/v1',
    'fireworks': 'https://api.fireworks.ai/inference/v1',
    'perplexity': 'https://api.perplexity.ai',
    'xai': 'https://api.x.ai/v1',
}

_PROVIDER_ALIASES = {
    # 'anthropic' intentionally excluded: unconfigured, no API key provided
    'deepseek': (['nvidia', 'qwen-cloud', 'deepseek'], 'deepseek'),
    # curated VIEWS over the mixed OpenRouter catalog, not single brands
    'openai-codex': (['openrouter'], ''),
    'openai': (['openrouter'], 'gpt'),
    'zai': (['nvidia', 'zhipu'], 'glm'),
    'zhipu': (['zhipu', 'nvidia'], 'glm'),
    'qwen': (['qwen-cloud'], 'qwen'),
    'mistral': (['nvidia', 'openrouter'], 'mistral'),
    'meta': (['nvidia'], 'llama'),
    'llama': (['nvidia'], 'llama'),
    'xai': (['nvidia', 'openrouter'], 'grok'),
    'cohere': (['cohere'], 'command'),
    'together': (['openrouter'], ''),
    'groq': (['nvidia'], ''),
}


def _alias_models(pid, merged):
    """Models a config provider really serves, via its gateway prefixes."""
    entry = _PROVIDER_ALIASES.get(pid)
    if not entry:
        return []
    prefixes, needle = entry
    out = []
    for card in merged:
        if card['id'] not in prefixes:
            continue
        for m in (card.get('models') or []):
            if not needle or needle in m.get('id', '').lower():
                # ids are "<gateway>/<vendor>/<model>" for routed catalogs
                # (openrouter/black-forest-labs/flux.2-pro) but only
                # "<gateway>/<vendor>/<model>" for flat ones, so take the
                # segment after the gateway prefix.
                parts = m.get('id', '').split('/')
                vendor = parts[1] if len(parts) > 2 else (parts[0] if parts else '')
                out.append(dict(m, provider=pid, vendor=vendor))
    return out


def get_live_providers():
    """
    Providers + models straight from the Hermes OpenAI-compatible gateway.
    This is the live source of truth: anything the gateway stopped serving is
    simply absent, so hiding a model upstream hides it here on the next sync.
    Config-only providers are merged in (with 0 live models) so nothing is lost.
    """
    live = hermes_gateway.catalog()
    by_prefix = {p['id']: p for p in live['providers']}

    merged = []
    for p in live['providers']:
        cfg = (config_provider_map() or {}).get(p['id'], {})
        merged.append({
            'id': p['id'],
            'name': cfg.get('display_name') or p['name'],
            'display_name': cfg.get('display_name') or p['name'],
            'kind': p['kind'],
            'enabled': cfg.get('enabled', True),
            'model_count': p['model_count'],
            'total_models': p['model_count'],
            'models': p['models'],
            'categories': p.get('categories', {}),
            'base_url': cfg.get('base_url') or 'Hermes gateway',
            'logo': _logo_for(p['id']),
            'status': 'Live',
            'source': 'gateway',
        })

    known = {p['id'] for p in merged}
    for pid, cfg in (config_provider_map() or {}).items():
        if pid in known:
            continue
        # Some config providers are fronted by a different gateway prefix.
        # Map the brand to the prefixes that actually serve it so the card
        # shows real model counts instead of a misleading 0.
        entry = _PROVIDER_ALIASES.get(pid)
        aliases = entry[0] if entry else []
        borrowed = [p for p in merged if p['id'] in aliases]
        alias_models = _alias_models(pid, merged)
        n_models = len(alias_models) or sum(p['model_count'] for p in borrowed)
        merged.append({
            'id': pid,
            'name': cfg.get('display_name') or pid.title(),
            'display_name': cfg.get('display_name') or pid.title(),
            'kind': 'router' if len({m.get('vendor', '') for m in alias_models
                                     if m.get('vendor')}) > 3 else 'direct',
            'enabled': cfg.get('enabled', True),
            'model_count': n_models,
            'total_models': n_models,
            # Surface the real models behind the alias, otherwise the detail
            # view opens on an empty list while the card claims 65 models.
            'models': alias_models,
            'served_by': [p['id'] for p in borrowed],
            'base_url': cfg.get('base_url') or 'official',
            'logo': _logo_for(pid),
            'status': ('Live (via %s)' % ', '.join(p['id'] for p in borrowed[:2])
                       if n_models else 'Configured'),
            'source': 'config',
        })

    # Apply the local visibility layer. Upstream has no model-level
    # enable/disable, so this is the only place hide/show can take effect.
    hidden_p = visibility.hidden_providers()
    hidden_m = visibility.hidden_models()
    if hidden_p or hidden_m:
        for card in merged:
            if card['id'] in hidden_p:
                card['hidden'] = True
            if hidden_m and card.get('models'):
                card['models'] = [m for m in card['models']
                                  if m.get('id') not in hidden_m
                                  and m.get('fullModel') not in hidden_m]
                card['model_count'] = len(card['models'])
                card['total_models'] = card['model_count']
        merged = [c for c in merged if not c.get('hidden')]

    # Prune against what the catalogue actually contains. The hidden set was
    # previously unioned into the "known" set, which made every hidden entry
    # trivially known and therefore never prunable - prune() was a guaranteed
    # no-op and hidden_store.json grew without bound.
    visibility.prune({c['id'] for c in merged},
                     {m.get('id') for c in merged
                      for m in (c.get('models') or [])})

    return merged


_cfg_cache = {'at': 0, 'map': None}


def config_provider_map():
    """providers: {} from config.yaml, cached 60s."""
    import time as _t
    if _cfg_cache['map'] is not None and _t.time() - _cfg_cache['at'] < 60:
        return _cfg_cache['map']
    try:
        if yaml is not None:
            with open(hermes_config_path(), 'r') as f:
                cfg = yaml.safe_load(f) or {}
            pm = cfg.get('providers', {}) or {}
        else:
            pm = {}
    except Exception:
        pm = {}
    _cfg_cache.update({'map': pm, 'at': _t.time()})
    return pm


def _json_safe(value, _depth=0):
    """Coerce an arbitrary payload into something json.dumps can always encode.

    Three separate failure modes are handled here, and all three used to take
    the whole response down rather than degrade it:

    1. Non-finite floats. ``json.dumps`` happily emits the bare tokens ``NaN``
       and ``Infinity``, which are NOT valid JSON, so the browser's
       ``JSON.parse`` rejects the response and the dashboard falls back to
       rendering a raw-text blob. A hardware reading that produces a NaN (or a
       float that overflowed to infinity) therefore silently broke the whole
       payload. They become ``None``/null, which is the honest encoding: the
       value was not a real measurement.
    2. Objects json.dumps has no rule for (set, bytes, Decimal, a psutil or
       datetime instance). These become their string form instead of raising.
    3. Self-referential structures, which raise "Circular reference detected".

    Depth is bounded so a pathological payload cannot turn normalisation into
    its own source of unbounded recursion; anything past the cap is stringified
    rather than walked.
    """
    # A non-finite float can only appear at a position json.dumps inspects
    # directly, and it must be intercepted before the C encoder sees it because
    # `default=` is never consulted for a float.
    if isinstance(value, float):
        return value if value == value and value not in (float('inf'), float('-inf')) else None
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if _depth > 64:
        return f'<max-depth:{type(value).__name__}>'
    if isinstance(value, dict):
        return {
            (k if isinstance(k, str) else str(k)): _json_safe(v, _depth + 1)
            for k, v in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [_json_safe(item, _depth + 1) for item in value]
    if isinstance(value, (set, frozenset)):
        # Sorted so the same input always serialises to the same bytes, which
        # keeps HTTP caching and log diffing meaningful.
        try:
            return sorted(_json_safe(item, _depth + 1) for item in value)
        except TypeError:
            return [_json_safe(item, _depth + 1) for item in value]
    if isinstance(value, (bytes, bytearray)):
        return value.decode('utf-8', errors='replace')
    return str(value)


def _encode_json(data):
    """Serialise to bytes, or raise. Kept separate from send_json so the
    encode step can be retried with an error envelope."""
    return json.dumps(
        _json_safe(data),
        # ensure_ascii stays ON deliberately. A log line read with
        # errors='replace' can still carry a lone surrogate, and with
        # ensure_ascii=False the resulting str raises UnicodeEncodeError at
        # .encode('utf-8') - turning one bad byte in a log file into a dead
        # response. Escaping keeps the payload pure ASCII, which is always
        # encodable, and JSON.parse restores the original characters.
        ensure_ascii=True,
        allow_nan=False,   # _json_safe has already removed every non-finite float
    ).encode('utf-8')


class TelemetryHandler(BaseHTTPRequestHandler):
    def send_json(self, data, code=200):
        try:
            body = _encode_json(data)
        except Exception as exc:  # noqa: BLE001 - last line of defence
            # A response MUST still be sent. Failing to encode is a bug in the
            # route, but letting it propagate kills the TCP connection with no
            # status line at all, which the client sees as RemoteDisconnected and
            # cannot distinguish from the backend being down. That is the exact
            # failure this server already fixed once for /api/sync-now; send_json
            # is shared by every route, so the guard belongs here.
            print(f'[send_json] encode failed: {type(exc).__name__}: {exc}', flush=True)
            body = _encode_json({
                'ok': False,
                'error': f'response encoding failed: {type(exc).__name__}',
            })
            code = 500
        try:
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            # The client hung up mid-response (navigation, tab close, an aborted
            # poll). Nothing to fix and nothing to report; raising here would
            # only print a socketserver traceback for a normal event.
            pass

    def do_POST(self):
        """Local visibility control. Upstream OmniRoute has no model-level
        enable/disable (PUT /api/models is rename-only and persists nothing),
        so hide/show is applied here and persisted to hidden_store.json."""
        
        if self.path == '/api/model/test':
            # Live Model Test Runner (9Router / OmniRouter pattern)
            try:
                n = int(self.headers.get('Content-Length') or 0)
                body = json.loads(self.rfile.read(n) or b'{}')
                model_id = body.get('model', '').strip()
                provider_id = body.get('provider', '').strip()
                kind = body.get('kind', 'text').strip()

                if not model_id:
                    return self.send_json({'ok': False, 'error': 'Missing model ID', 'latency_ms': 0}, 400)

                # Read the proxy's master key from its own env file, falling
                # back to whatever the gateway helper already resolved.
                key = ''
                try:
                    import re
                    with open(omniroute_env_path(), 'r', encoding='utf-8') as ef:
                        m_env = re.search(r'OMNIROUTE_API_KEY\s*=\s*["\']?([^"\'\r\n]+)', ef.read())
                        if m_env:
                            key = m_env.group(1).strip()
                except Exception:
                    pass
                if not key and hermes_gateway:
                    key = hermes_gateway._key()
                gw_url = OMNI_BASE + '/chat/completions'

                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {key}' if key else ''
                }

                prompt_text = body.get('prompt') or 'hi'
                # A non-numeric max_tokens is a client mistake, not a server
                # fault: int() on it used to raise ValueError and be reported as
                # a 500, which told the caller the backend was broken.
                try:
                    max_toks = int(body.get('max_tokens', 512 if len(prompt_text) > 4 else 64))
                except (TypeError, ValueError):
                    max_toks = 512 if len(prompt_text) > 4 else 64
                max_toks = max(1, min(max_toks, 32_000))
                payload = {
                    'model': model_id,
                    'messages': [{'role': 'user', 'content': prompt_text}],
                    'max_tokens': max_toks,
                    'stream': False
                }

                start = time.time()
                try:
                    if requests is not None:
                        res = requests.post(gw_url, headers=headers, json=payload, timeout=12)
                        status_code = res.status_code
                        res_text = res.text
                        try:
                            res_json = res.json()
                        except Exception:
                            res_json = None
                    else:
                        req_obj = urllib.request.Request(
                            gw_url,
                            data=json.dumps(payload).encode('utf-8'),
                            headers={**headers, 'Content-Type': 'application/json'},
                            method='POST'
                        )
                        try:
                            with urllib.request.urlopen(req_obj, timeout=12) as resp:
                                status_code = resp.status
                                res_text = resp.read().decode('utf-8', errors='replace')
                                try:
                                    res_json = json.loads(res_text)
                                except Exception:
                                    res_json = None
                        except urllib.error.HTTPError as err:
                            status_code = err.code
                            res_text = err.read().decode('utf-8', errors='replace')
                            try:
                                res_json = json.loads(res_text)
                            except Exception:
                                res_json = None

                    latency = int((time.time() - start) * 1000)

                    if status_code == 200:
                        data = res_json or {}
                        choices = data.get('choices', [])
                        msg = choices[0].get('message', {}) if choices else {}
                        reply = msg.get('content') or msg.get('reasoning_content') or msg.get('reasoning') or 'Model responded successfully'
                        usage = data.get('usage') or {}
                        cost_record = record_cost_usage(
                            model_id,
                            usage=usage,
                            prompt=prompt_text,
                            reply=reply,
                        )
                        return self.send_json({
                            'ok': True,
                            'status': 200,
                            'latency_ms': latency,
                            'reply': reply[:120],
                            'usage': usage,
                            'cost_usd': cost_record['cost_usd'] if cost_record else None,
                            'usage_source': cost_record['usage_source'] if cost_record else None,
                            'error': None
                        })
                    else:
                        err_text = ''
                        err_data = res_json
                        if isinstance(err_data, dict):
                            detail = err_data.get('error')
                            err_text = (
                                detail.get('message', '') if isinstance(detail, dict)
                                else detail if isinstance(detail, str)
                                else ''
                            ) or str(err_data)
                        elif err_data is not None:
                            err_text = str(err_data)
                        else:
                            err_text = res_text
                        return self.send_json({
                            'ok': False,
                            'status': status_code,
                            'latency_ms': latency,
                            'error': err_text[:200] or f'HTTP {status_code}'
                        })
                except (TimeoutError, urllib.error.URLError, getattr(getattr(requests, 'exceptions', None), 'Timeout', TimeoutError)):
                    latency = int((time.time() - start) * 1000)
                    return self.send_json({
                        'ok': False,
                        'status': 408,
                        'latency_ms': latency,
                        'error': 'Time Out (Model exceeded 12s response deadline)'
                    })
                except Exception as e:
                    latency = int((time.time() - start) * 1000)
                    return self.send_json({
                        'ok': False,
                        'status': 500,
                        'latency_ms': latency,
                        'error': str(e)[:180]
                    })
            except Exception as outer_err:
                return self.send_json({'ok': False, 'error': str(outer_err)}, 500)

        elif self.path == '/api/model/active':
            try:
                n = int(self.headers.get('Content-Length') or 0)
                body = json.loads(self.rfile.read(n) or b'{}')
                model_id = body.get('model', '').strip()
                provider_id = body.get('provider', '').strip()
                if not model_id:
                    return self.send_json({'ok': False, 'error': 'Missing model ID'}, 400)
                active_file = os.path.join(os.path.dirname(__file__), 'active_model_store.json')
                with open(active_file, 'w', encoding='utf-8') as af:
                    json.dump({'model': model_id, 'provider': provider_id, 'updated_at': time.time()}, af, indent=2)
                return self.send_json({'ok': True, 'active_model': model_id, 'provider': provider_id})
            except Exception as e:
                return self.send_json({'ok': False, 'error': str(e)}, 500)

        elif self.path == '/api/visibility':
            try:
                n = int(self.headers.get('Content-Length') or 0)
                body = json.loads(self.rfile.read(n) or b'{}')
                kind = body.get('kind')          # 'providers' | 'models'
                ident = body.get('id')
                hide = bool(body.get('hidden', True))
                if kind not in ('providers', 'models') or not ident:
                    raise ValueError('kind and id are required')
                now_hidden = visibility.set_hidden(kind, str(ident), hide)
                payload = {'ok': True, 'kind': kind, 'id': ident,
                           'hidden': now_hidden}
                code = 200
            except Exception as exc:
                payload = {'ok': False, 'error': str(exc)[:200]}
                code = 400
            # Routed through send_json rather than hand-written headers so this
            # route gets the same Content-Length, encoding guard and NaN/cycle
            # protection as every other route. It is a local single-user control,
            # so a malformed kind must stay a 400 - only send_json's encode
            # fallback can upgrade the status, and only when encoding itself fails.
            return self.send_json(payload, code)

        if self.path == '/api/visibility/reset':
            try:
                before = (len(visibility.hidden_providers()),
                          len(visibility.hidden_models()))
                visibility._write_locked(visibility._blank())
            except Exception as exc:  # noqa: BLE001
                return self.send_json({'ok': False, 'error': str(exc)[:200]}, 500)
            return self.send_json({'ok': True, 'cleared': {'providers': before[0],
                                                           'models': before[1]}})

        return self.send_json({'ok': False, 'error': 'unknown route'}, 404)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/visibility':
            return self.send_json({
                'providers': sorted(visibility.hidden_providers()),
                'models': sorted(visibility.hidden_models()),
            })
        if self.path == '/api/stats':
            data = get_telemetry()
            return self.send_json(data)
        elif self.path == '/api/cost-overview':
            return self.send_json(get_cost_overview())
        elif self.path == '/api/providers':
            return self.send_json(get_hermes_config_providers())
        elif self.path.startswith('/api/model/connection-health'):
            import live_sync
            cache = live_sync.read_cache()
            meta = cache.get('_meta', {})
            active_model = ''
            active_file = os.path.join(os.path.dirname(__file__), 'active_model_store.json')
            if os.path.exists(active_file):
                try:
                    with open(active_file, 'r', encoding='utf-8') as af:
                        active_data = json.load(af)
                        active_model = active_data.get('model', '')
                except Exception:
                    pass
            last_sync = meta.get('synced_at', 0)
            now = time.time()
            sync_age = now - last_sync if last_sync else 0
            status_obj = meta.get('status', {})
            is_ok = bool(status_obj.get('ok', True))
            total_models = meta.get('models', 0)
            
            status = 'online'
            if not is_ok or total_models == 0:
                status = 'offline'
            elif sync_age > 180:
                status = 'degraded'

            return self.send_json({
                'status': status,
                'latency_ms': meta.get('last_sync_duration_ms', 42),
                'active_model': active_model,
                'sync_age_sec': round(sync_age, 1),
                'total_models': total_models,
                'providers': meta.get('providers', 0),
                'sources': status_obj.get('sources', {})
            })

        elif self.path.startswith('/api/model/context'):
            # Dynamic Context Window Resolution via Upstream & OpenRouter / Models.dev
            import urllib.parse
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            model_id = qs.get('model', [''])[0].strip()
            provider_id = qs.get('provider', [''])[0].strip().lower()

            res_context = None
            res_output = None
            source = 'heuristic'

            if model_id:
                try:
                    clean_id = model_id.split('/')[-1].lower()
                    if requests is not None:
                        req = requests.get("https://openrouter.ai/api/v1/models", timeout=3)
                        code = req.status_code
                        or_data = req.json().get('data', []) if code == 200 else []
                    else:
                        code, res_json = _http_get_json("https://openrouter.ai/api/v1/models", timeout=3)
                        or_data = (res_json or {}).get('data', []) if code == 200 else []
                    if code == 200:
                        for item in or_data:
                            i_id = item.get('id', '').lower()
                            if i_id == model_id.lower() or i_id.endswith('/' + clean_id):
                                res_context = item.get('context_length')
                                res_output = item.get('top_provider', {}).get('max_completion_tokens')
                                source = 'openrouter-verified'
                                break
                except Exception:
                    pass

            if not res_context and model_id:
                s = model_id.lower()
                if 'space-bunny' in s:
                    res_context = 1000000
                    res_output = 65536
                    source = 'stealth-openrouter'
                elif 'union-alpha' in s:
                    res_context = 262144
                    res_output = 32768
                    source = 'stealth-openrouter'
                elif 'ox-alpha' in s:
                    res_context = 128000
                    res_output = 16384
                    source = 'stealth-openrouter'
                elif 'gpt-6' in s or 'sol' in s or 'astra' in s:
                    res_context = 400000
                    res_output = 128000
                    source = 'stealth-frontier'
                elif 'gemini-2' in s or 'gemini-1.5' in s or '1m' in s:
                    res_context = 1048576
                    res_output = 65536
                    source = 'estimated'
                elif '2m' in s:
                    res_context = 2097152
                    res_output = 65536
                    source = 'estimated'
                elif 'deepseek' in s or 'r1' in s or 'hermes' in s or 'qwen-2.5-72b' in s:
                    res_context = 200000
                    res_output = 16384
                    source = 'estimated'
                elif 'gpt-4o' in s or 'o1' in s or 'o3' in s or 'claude-3-5' in s or 'llama-3.1' in s or 'llama-3.3' in s:
                    res_context = 128000
                    res_output = 8192
                    source = 'estimated'
                elif 'whisper' in s or 'tts' in s or 'embed' in s:
                    res_context = 8192
                    res_output = 4096
                    source = 'estimated'
                else:
                    res_context = 128000
                    res_output = 8192
                    source = 'default-standard'

            def fmt_ctx(num):
                if not num: return '128k'
                if num >= 1000000:
                    val = num / 1000000
                    return f"{val:.0f}M" if val.is_integer() else f"{val:.1f}M"
                if num >= 1000:
                    val = num / 1000
                    return f"{val:.0f}k" if val.is_integer() else f"{val:.1f}k"
                return str(num)

            return self.send_json({
                'ok': True,
                'model_id': model_id,
                'provider_id': provider_id,
                'raw_context': res_context,
                'formatted_context': fmt_ctx(res_context),
                'max_output_tokens': res_output or 8192,
                'source': source
            })
        elif self.path == '/api/all-providers':
            return self.send_json(get_all_config_providers())
        elif self.path == '/api/live-providers':
            data = get_live_providers()
            return self.send_json(data)
        elif self.path == '/api/hermes/status':
            # Live gateway heartbeat + active model config. get_hermes_status()
            # is total: it reports an unreadable source as data, so this can be
            # called directly. The try is only a backstop so an unexpected bug
            # still answers with JSON rather than dropping the connection.
            try:
                return self.send_json(get_hermes_status())
            except Exception as exc:  # noqa: BLE001
                print(f'[hermes] status failed: {type(exc).__name__}: {exc}', flush=True)
                return self.send_json({
                    'ok': False,
                    'error': f'{type(exc).__name__}: {exc}',
                    'served_profiles': [],
                    'platforms': [],
                }, code=500)
        elif self.path.startswith('/api/agents/active'):
            # Live agent sessions: which model each one is running, the prompt it
            # was given, and its execution stream. The reader is total - an
            # unreadable store is reported in `sources`, never as a 500 - so this
            # calls straight through. The try is only a backstop for an
            # unexpected bug, which still answers with JSON rather than dropping
            # the connection the frontend is polling.
            try:
                return self.send_json(agent_stream.read_active_agents())
            except Exception as exc:  # noqa: BLE001
                print(f'[agents] active failed: {type(exc).__name__}: {exc}', flush=True)
                return self.send_json({
                    'ok': False,
                    'error': f'{type(exc).__name__}: {exc}',
                    'count': 0,
                    'live_count': 0,
                    'agents': [],
                }, code=500)
        elif self.path.startswith('/api/agents/logs'):
            # startswith, not ==: self.path carries the query string, so an
            # exact match 404s on the very first '?session=' it is meant to read.
            import urllib.parse
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            session_id = (qs.get('session', [''])[0] or '').strip()
            raw_limit = qs.get('limit', [str(agent_stream.CALL_LIMIT)])[0]
            try:
                limit = int(raw_limit)
            except (TypeError, ValueError):
                limit = agent_stream.CALL_LIMIT
            try:
                return self.send_json(
                    agent_stream.read_agent_logs(session_id or None, limit))
            except Exception as exc:  # noqa: BLE001
                print(f'[agents] logs failed: {type(exc).__name__}: {exc}', flush=True)
                return self.send_json({
                    'ok': False,
                    'error': f'{type(exc).__name__}: {exc}',
                    'count': 0,
                    'calls': [],
                }, code=500)
        elif self.path.startswith('/api/provider-nodes'):
            # Display labels for the ported logger's provider column. The ledger
            # records a provider name per call, so the distinct set is the
            # whole answer; there is no separate node registry to read.
            try:
                import urllib.parse
                qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
                if omniroute_logs is None:
                    return self.send_json({'nodes': []})
                return self.send_json(omniroute_logs.read_provider_nodes())
            except Exception as exc:  # noqa: BLE001
                print(f'[provider-nodes] failed: {type(exc).__name__}: {exc}', flush=True)
                return self.send_json({'nodes': []})
        elif self.path.startswith('/api/usage/call-logs/filters'):
            # Filter options for the ported request logger. Upstream builds its
            # dropdowns from the whole call_logs table plus configured keys, not
            # the loaded page, so a value with no visible row is still pickable.
            # Read-only over the same ledger.
            try:
                return self.send_json(omniroute_logs.read_call_log_filters()
                                      if omniroute_logs is not None else {})
            except Exception as exc:  # noqa: BLE001
                print(f'[usage] filters failed: {type(exc).__name__}: {exc}', flush=True)
                return self.send_json({})
        elif self.path.startswith('/api/usage/call-logs'):
            # Page of call logs in the ported logger's row shape.
            try:
                import urllib.parse
                qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
                if omniroute_logs is None:
                    return self.send_json([])
                return self.send_json(omniroute_logs.read_call_logs_page(qs))
            except Exception as exc:  # noqa: BLE001
                print(f'[usage] call-logs failed: {type(exc).__name__}: {exc}', flush=True)
                return self.send_json([])
        elif self.path.startswith('/api/logs/detail'):
            # Latest call's full artifact, for the detail modal.
            try:
                if omniroute_logs is None:
                    return self.send_json({'ok': False, 'error': 'reader unavailable'})
                import urllib.parse
                qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
                cid = (qs.get('id', [''])[0] or '').strip()
                return self.send_json(omniroute_logs.read_call_log_detail(cid))
            except Exception as exc:  # noqa: BLE001
                print(f'[logs] detail failed: {type(exc).__name__}: {exc}', flush=True)
                return self.send_json({'ok': False, 'error': str(exc)[:200]})
        elif self.path.startswith('/api/logs/console'):
            # Serves the ported console log viewer, which asks for
            # /api/logs/console?limit=500&level=<floor> and expects a bare JSON
            # array of {timestamp, level, component, message} entries.
            #
            # Reads only: both underlying readers are existing read paths over
            # log files and the call ledger. Nothing here writes, retries, or
            # re-sends a request.
            import urllib.parse
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            limit = qs.get('limit', ['500'])[0]
            floor = (qs.get('level', ['all'])[0] or 'all').lower()
            try:
                rows = build_console_log_entries(limit, floor)
                return self.send_json(rows)
            except Exception as exc:  # noqa: BLE001
                print(f'[console] log build failed: {type(exc).__name__}: {exc}', flush=True)
                return self.send_json([], code=500)
        elif self.path.startswith('/api/hermes/logs'):
            # startswith, not ==: self.path carries the query string, so an
            # exact match 404s on the very first '?limit=' it is meant to read.
            import urllib.parse
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            limit = qs.get('limit', [HERMES_LOG_DEFAULT_LIMIT])[0]
            source = qs.get('source', ['gateway'])[0]
            # Absent -> None -> unfiltered read. Present-but-invalid is reported
            # by get_hermes_logs rather than answered with every profile's
            # traffic, which would be indistinguishable from a working filter.
            profile = qs.get('profile', [None])[0]
            try:
                return self.send_json(get_hermes_logs(limit, source, profile))
            except Exception as exc:  # noqa: BLE001
                print(f'[hermes] logs failed: {type(exc).__name__}: {exc}', flush=True)
                return self.send_json({
                    'ok': False,
                    'error': f'{type(exc).__name__}: {exc}',
                    'logs': [],
                    'count': 0,
                }, code=500)
        elif self.path.startswith('/api/omniroute/call-logs') or self.path.startswith('/api/omniroute/logs'):
            # startswith: self.path carries '?limit=&offset='.
            import urllib.parse
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            limit = qs.get('limit', [str(omniroute_logs.CALLS_DEFAULT_LIMIT)])[0] \
                if omniroute_logs else 40
            offset = qs.get('offset', ['0'])[0] if omniroute_logs else 0
            try:
                if omniroute_logs is None:
                    # The reader is missing. Say so with a status rather than
                    # answering 200 with an empty ledger, which would render as
                    # "no traffic yet" instead of "this build cannot read it".
                    return self.send_json({
                        'ok': False,
                        'error': 'omniroute_logs module unavailable',
                        'count': 0,
                        'total': 0,
                        'calls': [],
                    }, code=503)
                # The reader is total: an unreadable store comes back as data with
                # source.ok false, so this calls straight through.
                return self.send_json(omniroute_logs.read_call_logs(limit, offset))
            except Exception as exc:  # noqa: BLE001
                print(f'[omniroute] call-logs failed: {type(exc).__name__}: {exc}', flush=True)
                return self.send_json({
                    'ok': False,
                    'error': f'{type(exc).__name__}: {exc}',
                    'count': 0,
                    'total': 0,
                    'calls': [],
                }, code=500)
        elif (self.path.startswith('/api/omniroute/call-log')
                and not self.path.startswith('/api/omniroute/call-logs')):
            # Singular: one call's detail payload, by id. Split from the list
            # route so opening a row reads one 300KB artifact on demand instead of
            # joining half a megabyte onto every page of the table.
            #
            # The plural route is matched first AND excluded here, because
            # '/api/omniroute/call-logs' also starts with '/api/omniroute/call-log'
            # and would otherwise be read as a detail request for the id 's'.
            import urllib.parse
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            call_id = (qs.get('id', [''])[0] or '').strip()
            try:
                if omniroute_logs is None:
                    return self.send_json({
                        'ok': False,
                        'available': False,
                        'error': 'omniroute_logs module unavailable',
                        'id': call_id,
                    }, code=503)
                if not call_id:
                    return self.send_json({
                        'ok': False,
                        'available': False,
                        'error': 'id query parameter is required',
                        'id': '',
                    }, code=400)
                detail = omniroute_logs.read_call_log_detail(call_id)
                # An unknown id is a real answer about a real request, so it is a
                # 404 the client can branch on - not a 200 with an empty drawer
                # that looks like a call with no captured body.
                return self.send_json(detail, code=200 if detail.get('available')
                                      else 404)
            except Exception as exc:  # noqa: BLE001
                print(f'[omniroute] call-log failed: {type(exc).__name__}: {exc}', flush=True)
                return self.send_json({
                    'ok': False,
                    'available': False,
                    'error': f'{type(exc).__name__}: {exc}',
                    'id': call_id,
                }, code=500)
        elif self.path == '/api/synced-models':
            # Live-synced catalogue: gateway + Hermes config + OmniRoute, merged.
            # Returned as a LIST so the frontend can consume it exactly like
            # /api/live-providers without a shape change.
            import live_sync
            cache = live_sync.read_cache()
            meta = cache.pop('_meta', {})
            rows = [cache[k] for k in sorted(cache) if not k.startswith('_')]
            for p in rows:
                p.setdefault('model_count', len(p.get('models') or []))
                p['total_models'] = p['model_count']
            # The live catalogue changes under us between polls, so it must never
            # be served from an intermediary cache.
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store')
            body = _encode_json({'providers': rows, '_meta': meta})
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        elif self.path == '/api/sync-status':
            import live_sync
            return self.send_json(live_sync.read_cache().get('_meta', {}))
        elif self.path == '/api/sync-now':
            import live_sync
            # sync_once is documented never to raise, but an unguarded call here
            # meant a failure dropped the connection with no HTTP response at
            # all (RemoteDisconnected) instead of an error the UI can show.
            try:
                _p, sync_result = live_sync.sync_once()
                return self.send_json(sync_result)
            except Exception as exc:
                print(f"[sync-now] {type(exc).__name__}: {exc}", flush=True)
                return self.send_json({
                    'ok': False,
                    'error': f'{type(exc).__name__}: {exc}',
                }, code=500)
        elif self.path == '/api/gateway-status':
            try:
                return self.send_json(hermes_gateway.status())
            except Exception as exc:  # noqa: BLE001
                # hermes_gateway can be None when the import failed, and status()
                # is not total. A gateway that cannot describe itself is still an
                # answerable route, so report it rather than dropping the socket.
                print(f'[gateway-status] {type(exc).__name__}: {exc}', flush=True)
                return self.send_json(
                    {'ok': False, 'error': f'{type(exc).__name__}: {exc}'}, 500)
        elif self.path == '/api/health':
            try:
                return self.send_json(model_health.summary())
            except Exception as exc:  # noqa: BLE001
                print(f'[health] {type(exc).__name__}: {exc}', flush=True)
                return self.send_json(
                    {'ok': False, 'error': f'{type(exc).__name__}: {exc}'}, 500)
        elif self.path == '/api/stats':
            # get_telemetry reads psutil, which can raise on a procfs read race
            # (a process exiting between enumeration and inspection). It is a
            # 2s-cadence poll, so an unhandled raise here would be the most
            # visible failure on the dashboard.
            try:
                return self.send_json(get_telemetry())
            except Exception as exc:  # noqa: BLE001
                print(f'[stats] {type(exc).__name__}: {exc}', flush=True)
                return self.send_json(
                    {'ok': False, 'error': f'{type(exc).__name__}: {exc}'}, 500)
        else:
            return self.send_json({'ok': False, 'error': 'unknown route'}, 404)

    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    # Live sync: keep the merged catalogue (Hermes config + OmniRoute) fresh.
    # Read-only on both sources; a failure here never blocks the HTTP server.
    try:
        import live_sync
        live_sync.sync_once()                      # prime the cache before serving
        live_sync.start_background()               # then refresh every 30s
        print('[nexus] live sync started', flush=True)
    except Exception as e:                        # noqa: BLE001
        print(f'[nexus] live sync failed to start: {type(e).__name__}: {e}', flush=True)

    server = HTTPServer(('127.0.0.1', 5174), TelemetryHandler)
    server.serve_forever()
