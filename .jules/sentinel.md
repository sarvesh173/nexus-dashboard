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

## 2026-10-24 - Safely handle raw string session model values in agent stream
**Learning**: In `agent_stream.py`, `_read_sessions` parsed `session_model_dict` using `_loads(model, {})`. When `model` was stored as a bare model string (e.g. `'claude-3-5-sonnet'`) rather than a JSON dictionary string, `_loads` failed to parse a dict, setting `session_model_dict` to `{}` and causing `model_id` to resolve as `None`.
**Action**: Updated `_read_sessions` to construct `{'id': model}` when `model` is a non-empty string and does not parse into a JSON object, matching `format_model` behavior. Added regression test `test_raw_string_session_model_resolves_id` in `tests/test_agent_stream.py`.
**Fingerprint**: agent_stream.py:473 - LogicError: raw string session model resolves to None model_id
