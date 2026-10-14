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

## 2026-10-07 - Implement SQL-level filtering for call logs and fix test suite discovery
**Learning**: In `omniroute_logs.py`, query parameters (`model`, `provider`, `account`, `status`, `agent`, `search`) were previously filtered in Python memory after slicing a single page from SQLite. This broke offset pagination and returned 0 results whenever matching rows fell outside the initial un-filtered page window.
**Action**: Pushed filtering directly into parameterized SQLite `WHERE` clauses in `_build_where_clause` and `_query_calls`, updated the cache key in `read_call_logs`, guarded Playwright browser check execution in `tests/test_dashboard_mounts.py`, and added unit tests in `tests/test_omniroute_logs.py`.
**Fingerprint**: omniroute_logs.py:230 - SQL filtering for call logs page and query pagination
