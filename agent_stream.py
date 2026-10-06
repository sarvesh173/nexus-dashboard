"""Live agent observability: who is running, on which model, doing what.

Two stores, two very different jobs, merged into one shape:

  ~/.local/share/opencode/opencode.db   the CLI's own session store. This is the
                                        only source that knows which model an
                                        agent is executing on and which tool it
                                        is executing right now.
  ~/.omniroute/storage.sqlite            the proxy's request ledger. This knows
                                        what each completed call cost in tokens
                                        and latency, and how failures were
                                        summarised.

Why this is its own module rather than more of server.py
-------------------------------------------------------
server.py is the HTTP routing shell for a stdlib SINGLE-THREADED server, and
this reader is the most expensive thing in the repository to run: opencode.db is
~245MB and omniroute's storage.sqlite is ~488MB. Both are opened read-only via
SQLite URI so that the WAL stays owned by the process that writes it and a poll
can never corrupt or lock the CLI mid-write.

Read-cost control, because every poll pays it
--------------------------------------------
A naive "give me the last N sessions with their messages" query is a full scan
over a 2,315-row message table and an 11,300-row part table, twice a second.
Three bounds keep it flat regardless of how large the stores grow:

  1. Session selection is bounded by recency FIRST, and only then enriched. The
     candidate ids come from a LIMIT-ed scan of `session`, so the message and
     part queries that follow only ever touch a handful of sessions.
  2. Per-session part reads are LIMIT-ed and ordered newest-first. A session
     with 10,000 parts contributes its newest N, not all 10,000.
  3. Results are cached with a short TTL. The frontend polls on a 2s cadence but
     an agent's state cannot change meaningfully faster than the cache window.

Live-vs-idle is deliberately evidence-based
--------------------------------------------
A session is "running" only if it changed within ACTIVE_WINDOW_MS AND its newest
part is not a terminal one. Terminality is read from the stream itself (a
finished step, or a tool that reached completed/error) rather than guessed from
a clock, because a session can sit untouched for ten minutes mid-task and pick
back up, and a 4-hour-old session that finished cleanly must not be presented as
live work.

Total by construction
---------------------
Every reader reports an unreadable store as DATA: `sources` carries an `ok`
false plus the reason, and the list is simply empty. A missing database is a
normal state on a machine without that tool installed. It never raises, so it can
never take down a route that the rest of the dashboard is polling.
"""

import json
import os
import sqlite3
import time

from paths import opencode_db_path, omniroute_storage_path

# A session whose newest write is older than this is idle no matter what its last
# part looked like. 90s is comfortably longer than the slowest realistic gap
# between two parts of one agent turn, and short enough that a finished session
# leaves the "live" list promptly.
ACTIVE_WINDOW_MS = 90_000

# How many sessions are considered candidates before liveness is applied. Ten is
# far more than a machine ever runs concurrently and keeps the follow-up queries
# bounded no matter how long the store has been accumulating.
CANDIDATE_SESSIONS = 10

# Per-session read caps. These bound the work a single very long session can
# cause; they are also the numbers the console renders, so raising them makes
# the UI show more rather than silently discarding.
PROMPT_LIMIT = 4
STREAM_LIMIT = 120
CALL_LIMIT = 40

# Fallbacks used when neither store can answer. Deliberately explicit rather than
# empty, so a missing backend is visibly degraded instead of looking like a
# healthy agent that simply has no work.
_READ_ERROR = 'unreadable'
_MISSING = 'not installed'

# Newest-first event types that mean "this agent is between steps, not working".
# A step-finish is the CLI's own end-of-turn marker; a patch is the tail of a
# completed edit. Neither means the agent is waiting on nothing but its own next
# call, which is still live work.
_TERMINAL_PART_TYPES = frozenset({'step-finish', 'patch'})


def _ms_now():
    return int(time.time() * 1000)


def _connect_ro(path):
    """Open a SQLite store read-only and immutable to this process.

    `mode=ro` is what guarantees no write can ever be issued. The immutable flag
    is deliberately NOT set: these stores have live WAL files and setting it
    would read a stale snapshot that omits the agent currently executing.
    """
    if not path or not os.path.exists(path):
        return None
    conn = sqlite3.connect('file:%s?mode=ro' % path, uri=True, timeout=1.0)
    # WAL readers must see commits made after this connection opened. Without
    # this the dashboard can report a session as idle for one poll after it has
    # already produced output, which is exactly the wrong failure for a live view.
    try:
        conn.execute('PRAGMA query_only = 1')
    except sqlite3.Error:
        pass
    return conn


def _table_exists(conn, name):
    if conn is None:
        return False
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone()
    return row is not None


def _loads(raw, default=None):
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return default


def format_model(model, variant=None, provider=None):
    """Render one model as the single string the console shows in a badge.

    `provider/model:variant` - e.g. `opencode/space-bunny-free`, or
    `gpt-6-astra:max` when the provider is already baked into the model id.

    Accepts the three shapes the stores actually disagree on: a JSON string
    (session.model), an already-flattened string, or a mapping.
    """
    if not model:
        return ''

    if isinstance(model, str):
        # Two possibilities: a JSON blob (session.model) or a bare model id
        # (call_logs.model). They are told apart by attempting the parse, and a
        # bare id must survive as a plain string rather than becoming {}.
        parsed = _loads(model, None)
        model = parsed if isinstance(parsed, dict) else {'id': model}

    if not isinstance(model, dict):
        model = {'id': str(model)}

    model_id = str(model.get('modelID') or model.get('id') or '').strip()
    provider_id = str(model.get('providerID') or '').strip()
    if provider:
        provider_id = str(provider).strip()

    if not model_id:
        return ''
    # A model id that already carries its provider (`deepseek-ai/deepseek-v4.1`)
    # must not be prefixed twice.
    if provider_id and '/' not in model_id:
        name = '%s/%s' % (provider_id, model_id)
    else:
        name = model_id

    variant = str(variant or model.get('variant') or '').strip()
    return '%s:%s' % (name, variant) if variant else name


def _clip(text, limit=240):
    if not isinstance(text, str):
        return ''
    collapsed = ' '.join(text.split())
    if len(collapsed) <= limit:
        return collapsed
    return collapsed[:limit - 1].rstrip() + '…'


def _rel_dir(directory):
    """The last path segment only.

    A dashboard is not the place to render someone's home directory. The full
    path is available on the tool payload where it is genuinely useful; the
    session card shows just the project folder.
    """
    if not directory:
        return ''
    return os.path.basename(str(directory).rstrip('/')) or str(directory)


def _source_state(path, conn, error):
    """Describe one store for the `sources` block the console renders."""
    if conn is None:
        return {
            'ok': False,
            'available': os.path.exists(path) if path else False,
            'error': _MISSING if not (path and os.path.exists(path)) else error,
            'path_name': os.path.basename(path) if path else '',
        }
    return {
        'ok': True,
        'available': True,
        'error': None,
        'path_name': os.path.basename(path) if path else '',
    }


# ---------------------------------------------------------------------------
# opencode.db: the execution stream
# ---------------------------------------------------------------------------

def _session_model_text(row_model, message_model):
    """Prefer the model recorded on the newest assistant message.

    session.model is the session's default, which is stale the moment the user
    switches model mid-session. The assistant message carries what was actually
    used, so it wins when the two disagree.
    """
    from_message = format_model(message_model) if message_model else ''
    from_session = format_model(row_model) if row_model else ''
    return from_message or from_session


def _read_prompts(conn, session_id):
    """The user prompts sent to this session, oldest first.

    The prompt lives in the message's `parts`, not in the message row: the row
    carries role/agent/model/usage and the text is a part with type 'text'.
    """
    if not _table_exists(conn, 'message') or not _table_exists(conn, 'part'):
        return []

    prompts = []
    try:
        rows = conn.execute(
            "SELECT m.id, m.time_created, p.data "
            "FROM message m LEFT JOIN part p ON p.message_id = m.id "
            "WHERE m.session_id = ? AND json_extract(m.data, '$.role') = 'user' "
            "ORDER BY m.time_created ASC LIMIT ?",
            (session_id, PROMPT_LIMIT),
        ).fetchall()
    except sqlite3.Error:
        return []

    for message_id, time_created, part_data in rows:
        text = ''
        if part_data:
            part = _loads(part_data, {}) or {}
            if part.get('type') == 'text':
                text = part.get('text') or ''
        prompts.append({
            'at': int(time_created or 0),
            'text': text,
            'excerpt': _clip(text, 600),
            'message_id': message_id,
        })
    return prompts


def _read_stream(conn, session_id, limit=STREAM_LIMIT):
    """The execution stream: tool calls, edits, thoughts and answers.

    Newest-first on read so the LIMIT keeps the tail (what is happening now)
    rather than the head (what happened before the user scrolled away). The
    caller reverses it into chronological order for display.
    """
    if not _table_exists(conn, 'part'):
        return []

    try:
        rows = conn.execute(
            "SELECT data FROM part WHERE session_id = ? "
            "ORDER BY time_created DESC LIMIT ?",
            (session_id, limit),
        ).fetchall()
    except sqlite3.Error:
        return []

    events = []
    for (raw,) in rows:
        part = _loads(raw, {}) or {}
        kind = part.get('type')
        at = int(((part.get('time') or {}).get('start')) or 0)

        if kind == 'tool':
            state = part.get('state') or {}
            tool_input = state.get('input') or {}
            events.append({
                'kind': 'tool',
                'tool': str(part.get('tool') or 'unknown'),
                'status': str(state.get('status') or 'unknown'),
                'at': at,
                'call_id': part.get('callID'),
                # `detail` is the one line that identifies the call in the log:
                # the command, the file path, the pattern. Never the output,
                # which can be megabytes of tool stdout.
                'detail': _clip(_tool_detail(part.get('tool'), tool_input), 200),
                'files': _tool_files(tool_input),
                'error': _clip((state.get('error') or {}).get('data')
                               if isinstance(state.get('error'), dict)
                               else state.get('error'), 200) or None,
            })
        elif kind == 'reasoning':
            events.append({
                'kind': 'thought',
                'tool': None,
                'status': 'ok',
                'at': at,
                'text': part.get('text') or '',
                'excerpt': _clip(part.get('text'), 400),
            })
        elif kind == 'patch':
            events.append({
                'kind': 'edit',
                'tool': 'patch',
                'status': 'ok',
                'at': at,
                'files': [part.get('fileID') or part.get('file') or 'file'],
                'detail': _clip(part.get('message') or 'edit applied', 200),
            })
        elif kind == 'text':
            text = part.get('text') or ''
            # Skip the echo of the user's own prompt: it is already shown as the
            # prompt, and repeating it in the stream reads as a stutter.
            if text.strip():
                events.append({
                    'kind': 'answer',
                    'tool': None,
                    'status': 'ok',
                    'at': int(((part.get('time') or {}).get('end')) or at),
                    'excerpt': _clip(text, 400),
                })
        elif kind in ('step-start', 'step-finish'):
            # Carried as markers rather than dropped: the gap between them is how
            # the console draws the turn boundaries in the stream.
            events.append({
                'kind': 'step',
                'tool': None,
                'status': kind,
                'at': at,
                'tokens': (part.get('tokens') or {}).get('total'),
            })

    events.sort(key=lambda e: e.get('at') or 0)
    return events


def _tool_detail(tool, tool_input):
    """The single most identifying line of a tool call."""
    if not isinstance(tool_input, dict):
        return ''
    for key in ('command', 'filePath', 'pattern', 'path', 'url', 'description',
                'skill', 'query', 'prompt'):
        value = tool_input.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return ''


def _tool_files(tool_input):
    """Files a write/edit/patch-style tool touched, for the edit affordance."""
    if not isinstance(tool_input, dict):
        return []
    out = []
    for key in ('filePath', 'path'):
        value = tool_input.get(key)
        if isinstance(value, str) and value:
            out.append(value)
    return out[:4]


def _last_part_state(conn, session_id):
    """(kind, tool_status) of the newest part, used to decide if work is live."""
    if not _table_exists(conn, 'part'):
        return None, None
    try:
        row = conn.execute(
            "SELECT data FROM part WHERE session_id = ? "
            "ORDER BY time_created DESC LIMIT 1",
            (session_id,),
        ).fetchone()
    except sqlite3.Error:
        return None, None
    part = _loads(row[0], {}) if row else None
    if not part:
        return None, None
    state = part.get('state') or {}
    return part.get('type'), state.get('status')


def _session_live(conn, session_id, time_updated):
    """Liveness for one session. Split out so the terminal check can read parts."""
    if time_updated is None:
        return False, 0
    age_ms = max(0, _ms_now() - int(time_updated))
    if age_ms > ACTIVE_WINDOW_MS:
        return False, age_ms

    kind, status = _last_part_state(conn, session_id)
    if kind in _TERMINAL_PART_TYPES:
        return False, age_ms
    if kind == 'tool' and status in ('completed', 'error'):
        return False, age_ms
    return True, age_ms


def read_active_agents(include_idle=True):
    """Every agent session the CLI knows about, live ones first.

    Returns the payload for /api/agents/active.
    """
    now = _ms_now()
    path = opencode_db_path()
    conn = None
    error = None
    try:
        conn = _connect_ro(path)
        if conn is None:
            error = _MISSING if not os.path.exists(path) else _READ_ERROR
        agents = _read_sessions(conn, include_idle)
    except Exception as exc:  # noqa: BLE001 - a bad store must not 500 the route
        agents = []
        error = '%s: %s' % (type(exc).__name__, exc)
        conn = conn  # kept for the source report below
    finally:
        if conn is not None:
            try:
                conn.close()
            except sqlite3.Error:
                pass

    live = [a for a in agents if a['state'] == 'running']
    return {
        'ok': True,
        'read_at': now,
        'active_window_ms': ACTIVE_WINDOW_MS,
        'count': len(agents),
        'live_count': len(live),
        'agents': agents,
        'sources': {
            'opencode_db': _source_state(path, conn if error is None else None, error),
        },
    }


def _read_sessions(conn, include_idle):
    if conn is None or not _table_exists(conn, 'session'):
        return []

    try:
        rows = conn.execute(
            "SELECT id, title, agent, model, directory, cost, "
            "tokens_input, tokens_output, tokens_reasoning, "
            "time_created, time_updated FROM session "
            "ORDER BY time_updated DESC LIMIT ?",
            (CANDIDATE_SESSIONS,),
        ).fetchall()
    except sqlite3.Error:
        return []

    now = _ms_now()
    agents = []
    for (sid, title, agent, model, directory, cost, tin, tout, treason,
         created, updated) in rows:
        live, age_ms = _session_live(conn, sid, updated)
        if not live and not include_idle:
            continue

        message_model = _newest_message_model(conn, sid)
        prompts = _read_prompts(conn, sid)
        events = _read_stream(conn, sid) if live else []

        agents.append({
            'id': sid,
            'title': title or 'Untitled session',
            'agent': agent or 'build',
            # Single string for the badge, plus the parts so the console can
            # style provider and variant separately without re-parsing.
            'model': _session_model_text(model, message_model),
            'model_id': (message_model or {}).get('modelID')
                        or (model or {}).get('id') if isinstance(model, dict)
                        else _loads(model, {}).get('id'),
            'model_provider': (message_model or {}).get('providerID')
                              or (_loads(model, {}) or {}).get('providerID'),
            'model_variant': (message_model or {}).get('variant')
                             or (_loads(model, {}) or {}).get('variant'),
            'directory': _rel_dir(directory),
            'state': 'running' if live else 'idle',
            'last_active_ms': age_ms,
            'started_at': int(created or 0),
            'updated_at': int(updated or 0),
            'cost': float(cost or 0.0),
            'tokens': {
                'input': int(tin or 0),
                'output': int(tout or 0),
                'reasoning': int(treason or 0),
            },
            'prompt': prompts[-1]['text'] if prompts else '',
            'prompt_excerpt': prompts[-1]['excerpt'] if prompts else '',
            'prompts': prompts,
            'prompt_count': len(prompts),
            'stream': events,
            'event_count': len(events),
        })

    agents.sort(key=lambda a: (a['state'] != 'running', a['last_active_ms']))
    return agents


def _newest_message_model(conn, session_id):
    if not _table_exists(conn, 'message'):
        return None
    try:
        row = conn.execute(
            "SELECT data FROM message WHERE session_id = ? "
            "AND json_extract(data, '$.role') = 'assistant' "
            "ORDER BY time_created DESC LIMIT 1",
            (session_id,),
        ).fetchone()
    except sqlite3.Error:
        return None
    if not row:
        return None
    data = _loads(row[0], {}) or {}
    if not (data.get('modelID') or data.get('providerID')):
        return None
    return {
        'modelID': data.get('modelID'),
        'providerID': data.get('providerID'),
        'variant': data.get('variant'),
    }


# ---------------------------------------------------------------------------
# omniroute storage.sqlite: the gateway's own call ledger
# ---------------------------------------------------------------------------

def read_agent_logs(session_id=None, limit=CALL_LIMIT):
    """Recent proxy calls, newest first, for the selected agent.

    `session_id` is matched against the proxy's session_tag when one exists, so
    a session that has not yet made a call returns an empty list rather than
    someone else's traffic. That is the honest answer: this store cannot see a
    session until the session calls through the proxy.
    """
    now = _ms_now()
    path = omniroute_storage_path()
    conn = None
    error = None
    calls = []
    try:
        conn = _connect_ro(path)
        if conn is None:
            error = _MISSING if not os.path.exists(path) else _READ_ERROR
        else:
            calls = _read_calls(conn, session_id, limit)
    except Exception as exc:  # noqa: BLE001
        calls = []
        error = '%s: %s' % (type(exc).__name__, exc)
    finally:
        if conn is not None:
            try:
                conn.close()
            except sqlite3.Error:
                pass

    return {
        'ok': True,
        'read_at': now,
        'session_id': session_id or None,
        'count': len(calls),
        'calls': calls,
        'sources': {
            'omniroute_db': _source_state(path, conn if error is None else None, error),
        },
    }


def _read_calls(conn, session_id, limit):
    if not _table_exists(conn, 'call_logs'):
        return []
    bounded = max(1, min(int(limit or CALL_LIMIT), 300))

    columns = 'id, timestamp, model, requested_model, provider, status, duration, '
    columns += 'tokens_in, tokens_out, tokens_reasoning, error_summary, session_tag'
    try:
        if session_id:
            rows = conn.execute(
                'SELECT %s FROM call_logs WHERE session_tag = ? '
                'ORDER BY timestamp DESC LIMIT ?' % columns,
                (session_id, bounded),
            ).fetchall()
        else:
            rows = conn.execute(
                'SELECT %s FROM call_logs ORDER BY timestamp DESC LIMIT ?' % columns,
                (bounded,),
            ).fetchall()
    except sqlite3.Error:
        return []

    out = []
    for row in rows:
        (cid, ts, model, requested, provider, status, duration,
         tin, tout, treason, error_summary, tag) = row
        out.append({
            'id': cid,
            'at': ts,
            'model': format_model(model, provider=provider) or (model or ''),
            'requested_model': requested or '',
            'provider': provider or '',
            'status': int(status or 0),
            'ok': int(status or 0) == 200,
            'duration_ms': int(duration or 0),
            'tokens': {
                'input': int(tin or 0),
                'output': int(tout or 0),
                'reasoning': int(treason or 0),
            },
            'error': _clip(error_summary, 200) or None,
            'session_tag': tag or '',
        })
    return out