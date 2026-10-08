"""OmniRouter call logging: the proxy's own per-LLM-call ledger.

The store
---------
`storage.sqlite` table `call_logs` is written by the OmniRouter proxy and is the
only record of what actually went over the wire: which model was requested, which
one answered, on which provider connection, for how long, at what token cost, and
with what status. The dashboard already reads a narrow slice of it for the agent
console (see `agent_stream.py`); this module reads it as a first-class traffic
surface instead.

Why this is its own module rather than more of server.py
-------------------------------------------------------
server.py is the HTTP routing shell for a stdlib SINGLE-THREADED server, and this
reader is the most expensive query in the repository: `storage.sqlite` is ~490MB
with a live WAL. Both facts push the query out of the routing file, exactly as
`agent_stream.py` does. The small local `_connect_ro` below is deliberately not
imported from `agent_stream` — it is a private symbol of that feature's module,
and reaching into it would make two independent features share one file's
internals. Six duplicated lines beat a cross-feature private import.

Cost control, because a table row carries a 300KB artifact
--------------------------------------------------------
Every row has a sibling JSON artifact under `call_logs/YYYY-MM-DD/`, and those
average ~300KB with a 524KB maximum. Reading one per poll, or shipping one to the
browser, would move a half-megabyte cost onto a view that renders 40 rows. So:

  1. The list route selects only the eleven scalar columns the table renders, and
     never touches `pipeline`, `request_body` or `response_body`.
  2. The detail route is opt-in per row and reads exactly one artifact, then
     reduces it to bounded excerpts before returning. A message body is clipped to
     `EXCERPT_CHARS` and the message list to `EXCERPT_MESSAGES`; the pipeline is
     reduced to stage NAMES and sizes, never payloads.
  3. Both routes are cached with a short TTL keyed on their parameters, so a
     frontend polling faster than the ledger actually changes cannot amplify
     either cost.

Degradation is total, by construction
-------------------------------------
Every reader reports an unreadable store as DATA: `source` carries `ok: false`
plus the reason and the list is simply empty. A machine without OmniRoute never
had a ledger to read, which is a normal state, not an error to raise. Nothing
here can take down a route the rest of the dashboard is polling.
"""

import json
import os
import re
import sqlite3
import time

from paths import OMNIROUTE_HOME, omniroute_storage_path

# Row caps. DEFAULT is what a first paint needs; MAX bounds a caller who asks for
# the entire ledger in one page, which on this store is 36k+ rows and several
# megabytes of JSON.
CALLS_DEFAULT_LIMIT = 40
CALLS_MAX_LIMIT = 300

# The proxy writes ISO-8601 UTC ('2026-10-06T23:10:13.103Z') and indexes it, so
# ordering by the raw string is chronological. Descending on an indexed TEXT
# column is a backwards index walk: the newest page costs the same as any other.
_ORDER = 'ORDER BY timestamp DESC, id DESC'

# The columns the ported table renders. All scalars — pulling any of the
# *_body / pipeline columns here is what makes this route slow.
#
# These are named by the ported table's own column set (account, api key,
# combo, cache source, ttft, session) rather than a hand-picked subset: the
# ledger records all of them, so leaving any out would show an empty cell for
# data that exists.
_LIST_COLUMNS = (
    'id', 'timestamp', 'model', 'requested_model', 'provider', 'duration',
    'tokens_in', 'tokens_out', 'tokens_reasoning', 'request_summary', 'status',
    # Below: added for the ported table's wider column set. Still all scalars.
    'account', 'api_key_id', 'api_key_name', 'correlation_id', 'combo_name',
    'cache_source', 'source_format', 'target_format', 'session_tag',
    'ttft_ms', 'added_wait_ms', 'added_wait_cause', 'model_pinned',
    'resilience_actions', 'tokens_cache_read', 'reasoning_effort_requested',
    'error_type', 'error_summary', 'detail_state',
)

# `method` and `path` are not in _LIST_COLUMNS (they are not rendered) but they
# ARE the honest fallback for a summary column: the proxy leaves
# `request_summary` NULL on most rows, and "POST /v1/chat/completions" is real
# recorded data rather than an invented label. Read in the same single query so
# the fallback costs no extra round trip.
_FALLBACK_COLUMNS = 'method, path'

# Excerpt bounds for the detail route. The artifact is parsed in full because
# json.load has no streaming mode, but nothing larger than these leaves it.
EXCERPT_CHARS = 1200
EXCERPT_MESSAGES = 12
# A single artifact can be half a megabyte; refuse to even parse one past this so
# a pathological file cannot stall the single-threaded server.
MAX_ARTIFACT_BYTES = 4 * 1024 * 1024

# Only these may be read, and each is resolved inside omniroute's own log dir.
# `source` is an allowlist rather than a join of caller input because it arrives
# from the query string; an unchecked join would be a traversal.
CALL_SOURCES = ('omniroute_db',)

_MISSING = 'not installed'
_UNREADABLE = 'unreadable'
_NO_TABLE = 'call_logs table not present'

# Artifact ids are UUIDs as written by the proxy. Anything else is refused before
# it can reach the filesystem. This is the second of two independent guards - the
# resolved path is additionally confined to the artifact root below.
_ID_RE = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F-]{4,}$')

# The artifact filename the proxy writes is `<iso8601>_<uuid>.json`, e.g.
# `2026-10-06T23-13-55.128Z_6ab3ff22-c504-42c1-a89b-1c86d38e1b7a.json`. Only the
# uuid after the final underscore is validated as an id; the timestamp half is
# checked by shape separately below.
_ARTIFACT_STEM_RE = re.compile(
    r'^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z_[0-9a-fA-F-]+\.json$'
)

# Cache TTLs. The ledger's newest row changes at the rate traffic arrives, so a
# 2s window is well inside the rate at which a new call can appear and well above
# the point where a faster poll would cost anything.
_CACHE_TTL = 2.0
_list_cache = {'at': 0.0, 'key': None, 'payload': None}
_detail_cache = {'at': 0.0, 'key': None, 'payload': None}


def _connect_ro(path):
    """Open a SQLite store read-only and immutable to this process.

    `mode=ro` is what guarantees no write can ever be issued. The immutable flag
    is deliberately NOT set: this store has a live WAL and setting it would read a
    stale snapshot that omits the call in flight right now.
    """
    if not path or not os.path.exists(path):
        return None
    conn = sqlite3.connect('file:%s?mode=ro' % path, uri=True, timeout=1.0)
    # WAL readers must see commits made after this connection opened, otherwise
    # the newest call stays invisible for one poll - which for a live traffic
    # table is exactly the wrong failure.
    try:
        conn.execute('PRAGMA query_only = 1')
    except sqlite3.Error:
        pass
    return conn


def _table_exists(conn, name):
    try:
        row = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
            (name,),
        ).fetchone()
    except sqlite3.Error:
        return False
    return row is not None


def _clip(value, limit=EXCERPT_CHARS):
    """Shorten a value to `limit` chars, marking that it was cut.

    Returns '' for a missing value rather than None so the view renders the same
    "absent" shape the metric-tile contract requires, and never the string
    'None'.
    """
    if value is None:
        return ''
    text = value if isinstance(value, str) else json.dumps(value, default=str)
    if len(text) <= limit:
        return text
    return text[:limit] + '\n... truncated'


def _as_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _as_str_list(value):
    """Coerce a stored column to a list of strings.

    The proxy stores `resilience_actions` as JSON text when it has any. On this
    ledger the column is NULL on every row, so an unparseable or empty value is
    normal and returns an empty list rather than raising — an empty cell in the
    table is the honest rendering of "nothing was recorded".
    """
    if not value:
        return []
    if isinstance(value, (list, tuple)):
        return [str(v) for v in value]
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return [str(value)]
    if isinstance(parsed, list):
        return [str(v) for v in parsed]
    return [str(parsed)]


def _clamp_limit(value):
    try:
        bounded = int(value)
    except (TypeError, ValueError):
        bounded = CALLS_DEFAULT_LIMIT
    return max(1, min(bounded, CALLS_MAX_LIMIT))


def _clamp_offset(value):
    try:
        offset = int(value)
    except (TypeError, ValueError):
        return 0
    return max(0, offset)


def _source_state(path, error):
    """The `source` block. `ok: false` here is a degraded store, never a lie."""
    if error:
        return {'ok': False, 'path': path, 'error': error}
    return {
        'ok': True,
        'path': path,
        'error': None,
        'size_bytes': os.path.getsize(path) if os.path.exists(path) else 0,
    }


def read_call_logs(limit=CALLS_DEFAULT_LIMIT, offset=0):
    """One page of the LLM call ledger, newest first.

    Pagination is offset-based because the table is ordered by an indexed
    timestamp and the frontend pages forward; `total` is a real COUNT(*) so the
    view can say how much traffic exists rather than guessing from a short page.
    """
    bounded_limit = _clamp_limit(limit)
    bounded_offset = _clamp_offset(offset)
    now = time.time()

    key = (bounded_limit, bounded_offset)
    cached = _list_cache['payload']
    if cached is not None and _list_cache['key'] == key:
        if now - _list_cache['at'] < _CACHE_TTL:
            return cached

    path = omniroute_storage_path()
    conn = None
    error = None
    calls = []
    total = 0
    try:
        conn = _connect_ro(path)
        if conn is None:
            error = _MISSING if not os.path.exists(path) else _UNREADABLE
        elif not _table_exists(conn, 'call_logs'):
            error = _NO_TABLE
        else:
            calls, total = _query_calls(conn, bounded_limit, bounded_offset)
    except Exception as exc:  # noqa: BLE001 - reported as data, never raised
        calls = []
        total = 0
        error = '%s: %s' % (type(exc).__name__, exc)
    finally:
        if conn is not None:
            try:
                conn.close()
            except sqlite3.Error:
                pass

    payload = {
        'ok': True,
        'count': len(calls),
        'total': total,
        'limit': bounded_limit,
        'offset': bounded_offset,
        'calls': calls,
        'source': _source_state(path, error),
        'read_at': now,
    }
    _list_cache['at'] = now
    _list_cache['key'] = key
    _list_cache['payload'] = payload
    return payload


def _query_calls(conn, limit, offset):
    """Page the ledger. Returns (rows, total).

    One query for the page and one COUNT(*) for the total, in that order and no
    more: each extra round trip against a 490MB store is paid on every poll.
    """
    columns = '%s, %s' % (', '.join(_LIST_COLUMNS), _FALLBACK_COLUMNS)
    try:
        rows = conn.execute(
            'SELECT %s FROM call_logs %s LIMIT ? OFFSET ?' % (columns, _ORDER),
            (limit, offset),
        ).fetchall()
        total = _as_int(
            conn.execute('SELECT COUNT(*) FROM call_logs').fetchone()[0], 0)
    except sqlite3.Error:
        return [], 0

    return [_shape_call(row) for row in rows], total


def _shape_call(row):
    """Ledger row -> the record shape the table renders.

    `request_summary` is passed through exactly as stored, including NULL. The
    proxy leaves it NULL on most rows, so the view needs to know the difference
    between "no summary recorded" and "summary is the empty string" - hence the
    explicit `has_summary` flag rather than a truthiness check the UI has to
    reimplement per call site.

    The row is unpacked by position against _LIST_COLUMNS + _FALLBACK_COLUMNS,
    so those two tuples and this destructuring must stay in the same order.
    """
    (cid, ts, model, requested, provider, duration,
     tin, tout, treason, summary, status,
     account, api_key_id, api_key_name, correlation_id, combo_name,
     cache_source, source_format, target_format, session_tag,
     ttft_ms, added_wait_ms, added_wait_cause, model_pinned,
     resilience_actions, cache_read, effort_requested,
     error_type, error_summary, detail_state,
     method, path) = row

    summary_text = summary if isinstance(summary, str) else ''
    method_text = method if isinstance(method, str) else ''

    return {
        'id': cid,
        'at': ts,
        'model': model or '',
        'requested_model': requested or '',
        'provider': provider or '',
        'status': _as_int(status),
        'ok': _as_int(status) == 200,
        'duration_ms': _as_int(duration),
        'tokens': {
            'input': _as_int(tin),
            'output': _as_int(tout),
            'reasoning': _as_int(treason) if treason is not None else None,
            'cache_read': _as_int(cache_read) if cache_read is not None else None,
        },
        'request_summary': summary_text,
        'has_summary': bool(summary_text.strip()),
        # Real recorded fields, not a substitute invented for the missing
        # summary: when the proxy recorded none, the request's own method and
        # path are what it is actually known to be.
        'method': method_text,
        'path': path or '',
        # The wider column set, recorded values only.
        'account': account or '',
        'api_key_id': api_key_id or '',
        'api_key_name': api_key_name or '',
        'correlation_id': correlation_id or '',
        'combo_name': combo_name or '',
        'cache_source': cache_source or '',
        'source_format': source_format or '',
        'target_format': target_format or '',
        'session_tag': session_tag or '',
        'ttft_ms': _as_int(ttft_ms) if ttft_ms is not None else None,
        'added_wait_ms': _as_int(added_wait_ms) if added_wait_ms is not None else None,
        'added_wait_cause': added_wait_cause or '',
        'model_pinned': bool(model_pinned),
        'resilience_actions': _as_str_list(resilience_actions),
        'reasoning_effort_requested': effort_requested or '',
        'error_type': error_type or '',
        'error_summary': error_summary or '',
        'detail_state': detail_state or '',
    }


def artifact_root():
    """Directory holding the per-call JSON artifacts."""
    return os.path.join(OMNIROUTE_HOME, 'call_logs')


def resolve_artifact(relpath):
    """Resolve a stored artifact_relpath inside the artifact root, or None.

    Two independent guards, because this is caller-influenced:

      1. `relpath` must match the exact shape the proxy writes
         (`YYYY-MM-DD/<iso>_<uuid>.json`). Anything else is refused outright.
      2. The resolved real path must still be inside the artifact root after
         symlink resolution, so a crafted but well-shaped path cannot escape.

    Returns None on any failure. The caller treats that as "no artifact", which
    is the honest state for a call whose body was never captured.
    """
    if not isinstance(relpath, str) or not relpath:
        return None
    if relpath != os.path.normpath(relpath) or relpath.startswith('/'):
        return None
    if '..' in relpath.split(os.sep):
        return None

    date_dir, _, filename = relpath.partition('/')
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_dir):
        return None
    if not _ARTIFACT_STEM_RE.match(filename):
        return None
    # The id half after the final underscore must itself be a uuid-shaped id.
    if not _ID_RE.match(filename[:-len('.json')].rsplit('_', 1)[-1]):
        return None

    root = os.path.realpath(artifact_root())
    candidate = os.path.realpath(os.path.join(root, relpath))
    if candidate != root and not candidate.startswith(root + os.sep):
        return None
    return candidate


def read_call_log_detail(call_id):
    """The bounded detail payload for one call, from its JSON artifact.

    Returns `ok: False` with a reason when the row, its artifact, or its stored
    relpath is absent. It never raises and never substitutes a placeholder
    payload for a missing one: an empty drawer with a stated reason is the
    honest answer, and a fabricated body would be indistinguishable from real
    traffic in the UI.
    """
    now = time.time()
    cached = _detail_cache['payload']
    if cached is not None and _detail_cache['key'] == call_id:
        if now - _detail_cache['at'] < _CACHE_TTL:
            return cached

    payload = {'ok': True, 'id': call_id, 'read_at': now}
    payload.update(_load_detail(call_id))

    _detail_cache['at'] = now
    _detail_cache['key'] = call_id
    _detail_cache['payload'] = payload
    return payload


def _load_detail(call_id):
    """Assemble the detail block. Never raises; every failure is a reason."""
    if not isinstance(call_id, str) or not _ID_RE.match(call_id):
        return {'available': False, 'error': 'invalid call id'}

    db_path = omniroute_storage_path()
    conn = None
    try:
        conn = _connect_ro(db_path)
        if conn is None:
            return {'available': False, 'error': _MISSING}
        if not _table_exists(conn, 'call_logs'):
            return {'available': False, 'error': _NO_TABLE}
        row = conn.execute(
            'SELECT timestamp, artifact_relpath, artifact_size_bytes, '
            'error_summary, detail_state, has_request_body, '
            'has_response_body, has_pipeline_details FROM call_logs WHERE id = ?',
            (call_id,),
        ).fetchone()
    except sqlite3.Error as exc:
        return {'available': False, 'error': '%s: %s' % (type(exc).__name__, exc)}
    finally:
        if conn is not None:
            try:
                conn.close()
            except sqlite3.Error:
                pass

    if row is None:
        return {'available': False, 'error': 'call not found'}

    (timestamp, relpath, size_bytes, error_summary, detail_state,
     has_request, has_response, has_pipeline) = row

    detail = {
        'available': True,
        'error': None,
        'at': timestamp,
        'artifact': {
            'relpath': relpath,
            'size_bytes': _as_int(size_bytes),
            'detail_state': detail_state or 'none',
        },
        'error_summary': error_summary,
        'captured': {
            'request': has_request == 1,
            'response': has_response == 1,
            'pipeline': has_pipeline == 1,
        },
    }

    path = resolve_artifact(relpath)
    if path is None:
        detail['body'] = None
        detail['body_error'] = 'no artifact recorded for this call'
        return detail
    if not os.path.exists(path):
        detail['body'] = None
        detail['body_error'] = 'artifact file is missing from disk'
        return detail
    if _as_int(size_bytes, 0) > MAX_ARTIFACT_BYTES:
        detail['body'] = None
        detail['body_error'] = 'artifact exceeds the readable size limit'
        return detail

    detail.update(_read_artifact(path))
    return detail


def _read_artifact(path):
    """Parse one artifact and reduce it to bounded excerpts."""
    try:
        if os.path.getsize(path) > MAX_ARTIFACT_BYTES:
            return {'body': None, 'body_error': 'artifact exceeds the readable size limit'}
        with open(path, 'r', encoding='utf-8', errors='replace') as fh:
            doc = json.load(fh)
    except (OSError, ValueError) as exc:
        return {'body': None, 'body_error': '%s: %s' % (type(exc).__name__, exc)}

    if not isinstance(doc, dict):
        return {'body': None, 'body_error': 'artifact is not a JSON object'}

    return {
        'body': {
            'schema_version': doc.get('schemaVersion'),
            'summary': doc.get('summary') if isinstance(doc.get('summary'), dict) else None,
            'request': _shape_request(doc.get('requestBody')),
            'response': _shape_response(doc.get('responseBody')),
            'error': doc.get('error'),
            'pipeline': _shape_pipeline(doc.get('pipeline')),
        },
        'body_error': None,
    }


def _shape_request(body):
    """The request, clipped. Message bodies here run to tens of kilobytes."""
    if not isinstance(body, dict):
        return None
    messages = body.get('messages')
    out = None
    if isinstance(messages, list):
        out = []
        for message in messages[:EXCERPT_MESSAGES]:
            if not isinstance(message, dict):
                out.append({'role': 'unknown', 'content': _clip(message)})
                continue
            out.append({
                'role': str(message.get('role') or 'unknown'),
                'content': _clip(message.get('content')),
            })
    return {
        'model': body.get('model'),
        'stream': body.get('stream'),
        'reasoning_effort': body.get('reasoning_effort'),
        'tool_count': len(body.get('tools')) if isinstance(body.get('tools'), list) else 0,
        'messages': out,
        'messages_total': len(messages) if isinstance(messages, list) else 0,
    }


def _shape_response(body):
    """The response, clipped. Only the first choice is rendered."""
    if not isinstance(body, dict):
        return None
    choices = body.get('choices')
    first = None
    if isinstance(choices, list) and choices and isinstance(choices[0], dict):
        message = choices[0].get('message')
        message = message if isinstance(message, dict) else {}
        first = {
            'role': message.get('role'),
            'content': _clip(message.get('content')),
            'finish_reason': choices[0].get('finish_reason'),
        }
    return {
        'choice_count': len(choices) if isinstance(choices, list) else 0,
        'first_choice': first,
        'usage': body.get('usage') if isinstance(body.get('usage'), dict) else None,
    }


def _shape_pipeline(pipeline):
    """Pipeline stage NAMES and sizes only.

    A single stage here is routinely 200KB of provider request/response bodies.
    The drawer shows that a stage ran and how big it was; it does not replay the
    payload. That keeps a row expansion at a few hundred bytes of wire traffic.
    """
    if not isinstance(pipeline, dict):
        return None
    stages = []
    for name, value in pipeline.items():
        if isinstance(value, (dict, list)):
            size = len(json.dumps(value, default=str))
        else:
            size = len(str(value))
        stages.append({'stage': name, 'bytes': size})
    stages.sort(key=lambda stage: stage['stage'])
    return stages


def classify_agent(call):
    """Which client made this call.

    The ledger has no agent column — nothing in `call_logs` names the process
    that issued the request, and the per-call artifacts do not retain request
    headers either (checked: no user-agent is stored). So this is an inference
    from what *is* recorded, and it says only what the evidence supports:

      'claude-protocol'  the caller spoke the Anthropic /v1/messages protocol,
                         which on this host is Claude Code.
      'auto-router'      the proxy made a routing decision (`combo_name` set),
                         meaning the caller asked for automatic selection
                         rather than naming a model.
      'unknown'          none of the above. Deliberately not a guess.

    Returning 'unknown' is a real answer. Labelling every unmarked row with a
    guessed agent name would put a confident-looking lie in a column the user is
    meant to trust.
    """
    if (call.get('path') or '') == '/v1/messages':
        return 'claude-protocol'
    if call.get('combo_name'):
        return 'auto-router'
    return 'unknown'


def _to_logger_row(call):
    """Ledger record -> the ported request logger's row shape.

    A rename plus what the ledger actually recorded. Where a field has no
    recorded value it is emitted empty rather than filled with an invented one,
    so an empty cell always means "not recorded" and never a plausible-looking
    fabrication.

    `agent` is the one derived value, and it is a documented inference rather
    than a recorded field — see `classify_agent`.
    """
    toks = call.get('tokens') or {}
    return {
        'id': call.get('id'),
        'timestamp': call.get('at'),
        'model': call.get('model') or '',
        'requestedModel': call.get('requested_model') or '',
        'provider': call.get('provider') or '',
        'account': call.get('account') or '',
        'apiKeyId': call.get('api_key_id') or '',
        'apiKeyName': call.get('api_key_name') or '',
        'correlationId': call.get('correlation_id') or '',
        'status': call.get('status'),
        'duration': call.get('duration_ms'),
        'ttft': call.get('ttft_ms'),
        'addedWaitMs': call.get('added_wait_ms'),
        'addedWaitCause': call.get('added_wait_cause') or '',
        'isRetry': False,
        'tokens': {
            'input': _as_int(toks.get('input')),
            'output': _as_int(toks.get('output')),
            'reasoning': toks.get('reasoning'),
            'cacheRead': toks.get('cache_read'),
        },
        'cacheSource': call.get('cache_source') or '',
        'sourceFormat': call.get('source_format') or '',
        'targetFormat': call.get('target_format') or '',
        'modelPinned': bool(call.get('model_pinned')),
        'sessionTag': call.get('session_tag') or '',
        'comboName': call.get('combo_name') or '',
        'reasoningEffort': call.get('reasoning_effort_requested') or '',
        'errorType': call.get('error_type') or '',
        'errorSummary': call.get('error_summary') or '',
        'detailState': call.get('detail_state') or '',
        'agent': classify_agent(call),
        'requestSummary': call.get('request_summary') or '',
        'hasSummary': bool(call.get('has_summary')),
        'method': call.get('method') or '',
        'path': call.get('path') or '',
    }


def read_call_logs_page(qs):
    """One page for the ported logger, honouring its query parameters.

    Read-only. Unknown filters are ignored rather than silently returning an
    unfiltered page, so a filter the ledger cannot honour is visible as
    'no rows' instead of masquerading as a filter that worked.
    """
    def first(name, default=''):
        v = qs.get(name)
        return (v[0] if v else default)

    limit = _clamp_limit(first('limit', '50'))
    offset = _clamp_offset(first('offset', '0'))

    payload = read_call_logs(limit, offset)
    calls = payload.get('calls') or []

    model = first('model')
    provider = first('provider')
    account = first('account')
    status = first('status')
    agent = first('agent')
    search = first('search').lower()

    rows = [_to_logger_row(c) for c in calls]

    if model:
        rows = [r for r in rows if r['model'] == model or r['requestedModel'] == model]
    if provider:
        rows = [r for r in rows if r['provider'] == provider]
    if account:
        rows = [r for r in rows if r['account'] == account]
    if status == 'error':
        rows = [r for r in rows if r['status'] != 200]
    elif status == 'ok':
        rows = [r for r in rows if r['status'] == 200]
    if agent:
        rows = [r for r in rows if r['agent'] == agent]
    if search:
        rows = [r for r in rows if search in json.dumps(r).lower()]

    # A bare array, not an envelope: the ported component does
    # `setLogs(await res.json())` and reads `data.length`. Returning
    # {'logs': [...]} here rendered the full table with "0 Total" and no rows,
    # because an object has no length.
    return rows


def read_call_log_filters():
    """Distinct filter values across the ledger, for the logger's dropdowns.

    Scans a bounded window rather than the whole table: a full scan of ~19k rows
    per dropdown load costs more than it is worth, and the newest window is the
    one a user is actually choosing from.
    """
    payload = read_call_logs(_clamp_limit('500'), 0)
    calls = payload.get('calls') or []
    models, providers, accounts, agents = {}, {}, {}, {}
    for c in calls:
        m = (c.get('model') or '').strip()
        p = (c.get('provider') or '').strip()
        a = (c.get('account') or '').strip()
        g = classify_agent(c)
        if m:
            models[m] = models.get(m, 0) + 1
        if p:
            providers[p] = providers.get(p, 0) + 1
        if a:
            accounts[a] = accounts.get(a, 0) + 1
        agents[g] = agents.get(g, 0) + 1

    def opts(d):
        return [{'value': k, 'count': v} for k, v in sorted(d.items())]

    return {
        'models': opts(models),
        'providers': opts(providers),
        'accounts': opts(accounts),
        # Accounts map to API keys on the proxy side; the ledger only holds the
        # one name, so the key dropdown stays empty rather than duplicating it.
        'apiKeys': [],
        'statuses': [],
        'agents': opts(agents),
    }


def read_provider_nodes():
    """Distinct provider names in the ledger, as the logger's node list.

    The ported table looks a provider up here to get a display label. Only the
    recorded name exists in this store, so each node carries that name and an
    empty label set rather than an invented one.
    """
    payload = read_call_logs(_clamp_limit('500'), 0)
    names = {}
    for c in (payload.get('calls') or []):
        p = (c.get('provider') or '').strip()
        if p:
            names[p] = names.get(p, 0) + 1
    return {'nodes': [{'id': k, 'name': k, 'count': v} for k, v in sorted(names.items())]}
