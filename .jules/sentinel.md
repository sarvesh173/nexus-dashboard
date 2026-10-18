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

## 2026-10-09 - Safe mocking for optional third-party modules in unit tests
**Learning**: Mocking functions directly on optional third-party modules (such as `patch("requests.get")` or `patch.object(model_health.requests, ...)`) raises `ModuleNotFoundError` or `AttributeError` when running tests in environments where the optional module is missing or set to `None`.
**Action**: Updated `tests/test_audit_fixes.py` to patch module attributes (`patch.object(run_sync, "requests", mock_req)`) or patch `sys.modules` (`patch.dict("sys.modules", {"requests": mock_req})`), ensuring tests run cleanly offline.
**Fingerprint**: tests/test_audit_fixes.py:457 - ModuleNotFoundError: No module named 'requests'

## 2026-10-09 - SQL query filtering vs Python memory filtering in omniroute_logs
**Learning**: `read_call_logs_page(qs)` in `omniroute_logs.py` applied query filters in Python memory after fetching a `LIMIT`/`OFFSET` page from SQLite, causing empty result pages and broken pagination for filtered queries.
**Action**: Created Sentinel finding report in `.jules/reports/2026-10-09.md` proposing direct SQL `WHERE` filtering in `omniroute_logs.py`.
**Fingerprint**: omniroute_logs.py:624 - Memory filtering after SQL limit/offset
