# Sentinel Audit Journal

## 2026-10-04 - Missing import in model health sync runner
**Learning**: `run_sync.py` imported `REPO_DIR` from `paths.py` but failed to import `hermes_config_path`, causing a runtime `NameError` whenever `model_health._api_key()` detected a valid key.
**Action**: Imported `hermes_config_path` in `run_sync.py` and added a regression test in `tests/test_audit_fixes.py`.
**Fingerprint**: run_sync.py:34 - NameError: hermes_config_path

## 2026-10-05 - Guard optional requests module usage in run_sync and model_health
**Learning**: `run_sync.py` and `model_health.py` imported `requests` inside `try...except ImportError` fallback blocks setting `requests = None`, but subsequent code called `requests.get()` / `requests.post()` without checking `if requests is not None`, causing `AttributeError: 'NoneType' object has no attribute 'get'`.
**Action**: Added explicit `if requests is not None` checks before making HTTP calls and safely handled `requests.Timeout` exception catching in `model_health.py` and `run_sync.py`. Added unit tests in `tests/test_audit_fixes.py`.
**Fingerprint**: run_sync.py:71 - AttributeError: 'NoneType' object has no attribute 'get'

## 2026-10-06 - Guard optional psutil and requests module usage in server.py
**Learning**: `server.py` imported `psutil` and `requests` inside `try...except ImportError` fallback blocks setting them to `None` when missing, but subsequent functions (`get_hermes_status`, `get_hermes_config_providers`, model test handling, model context lookup) called attributes/methods on `psutil` or `requests` without checking `if psutil is not None` or `if requests is not None`, causing `AttributeError: 'NoneType' object has no attribute 'Process'` / `'get'` / `'post'` / `'exceptions'`.
**Action**: Added explicit `if psutil is not None` and `if requests is not None` checks before referencing `psutil.Process` or `requests.get()` / `requests.post()` / `requests.exceptions.Timeout` in `server.py`. Added unit tests in `tests/test_audit_fixes.py`.
**Fingerprint**: server.py:513 - AttributeError: 'NoneType' object has no attribute 'Process'

## 2026-10-09 - Filter OmniRoute call logs directly in SQLite queries
**Learning**: In `omniroute_logs.py`, query parameters (`model`, `provider`, `account`, `status`, `agent`, `search`) were filtered in Python memory on a pre-paginated array returned by `read_call_logs(limit, offset)` instead of in the underlying SQLite queries, causing truncated pages and incorrect totals.
**Action**: Built parameterized SQLite `WHERE` clauses for row retrieval and `COUNT(*)` calculations directly in `_build_where` and `_query_calls`, and keyed the cache on the active filter tuple. Added unit tests in `tests/test_omniroute_logs.py`.
**Fingerprint**: omniroute_logs.py:692 - LogicError: in-memory filtering on pre-paginated array

## 2026-10-14 - Pre-parse session model dict in agent stream
**Learning**: In `agent_stream.py`, `_read_sessions` extracted `model_id`, `model_provider`, and `model_variant` using inline ternary expressions that evaluated `else` when `model` was a JSON string, bypassing `message_model`.
**Action**: Parsed `session_model_dict` from `model` prior to building agent records, ensuring `message_model` reliably overrides session defaults.
**Fingerprint**: agent_stream.py:476 - LogicError: ternary precedence in model metadata extraction

## 2026-10-20 - Safely patch optional requests module in unit test suite
**Learning**: Unit tests in `tests/test_audit_fixes.py` used `patch("requests.get")` and `patch.object(model_health.requests, ...)` directly, which caused `ModuleNotFoundError` or `AttributeError` when `requests` was not installed in the environment (because `requests` is an optional dependency in the project and `model_health.requests` is `None`).
**Action**: Patched `sys.modules` (`patch.dict("sys.modules", {"requests": fake_req})`) and target module attribute (`patch.object(model_health, "requests", mock_req)`), allowing the test suite to run completely offline without requiring optional third-party packages installed.
**Fingerprint**: tests/test_audit_fixes.py:457 - ModuleNotFoundError: No module named 'requests'

## 2026-10-30 - Collect unfiltered catalogue for visibility prune and fix log timestamp parsing
**Learning**: In `server.py`, `get_live_providers()` derived `known_providers` and `known_models` after filtering `merged` with local visibility rules, causing `visibility.prune()` to delete user-hidden entries from `hidden_store.json`. Also in `server.py`, `build_console_log_entries()` attempted `time.strptime` on ISO 8601 timestamps containing 'T', raising `ValueError` and breaking log sorting. In `agent_stream.py`, `_read_prompts` lacked `json_extract(p.data, '$.type') = 'text'` filtering, resulting in duplicate blank prompt entries, and `_read_sessions` failed to parse raw model ID strings into `session_model_dict`.
**Action**: Updated `server.py` to collect known provider/model IDs prior to visibility filtering and replaced 'T' with a space in timestamp strings before parsing. Added `json_extract` text filter and raw model ID dictionary wrapping in `agent_stream.py`. Added regression unit tests in `tests/test_audit_fixes.py` and `tests/test_agent_stream.py`.
**Fingerprint**: server.py:1578 - LogicError: visibility.prune deletes hidden items
**Fingerprint**: server.py:634 - ValueError: ISO 8601 time string contains T
**Fingerprint**: agent_stream.py:242 - LogicError: un-filtered non-text message parts in prompt query
**Fingerprint**: agent_stream.py:477 - TypeError: raw string model ID in session row
