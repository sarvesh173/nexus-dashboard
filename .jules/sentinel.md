# Sentinel Audit Journal

## 2026-10-04 - Missing import in model health sync runner
**Learning**: `run_sync.py` imported `REPO_DIR` from `paths.py` but failed to import `hermes_config_path`, causing a runtime `NameError` whenever `model_health._api_key()` detected a valid key.
**Action**: Imported `hermes_config_path` in `run_sync.py` and added a regression test in `tests/test_audit_fixes.py`.
**Fingerprint**: run_sync.py:34 - NameError: hermes_config_path

## 2026-10-05 - Guard optional requests module usage in run_sync and model_health
**Learning**: `run_sync.py` and `model_health.py` imported `requests` inside `try...except ImportError` fallback blocks setting `requests = None`, but subsequent code called `requests.get()` / `requests.post()` without checking `if requests is not None`, causing `AttributeError: 'NoneType' object has no attribute 'get'`.
**Action**: Added explicit `if requests is not None` checks before making HTTP calls and safely handled `requests.Timeout` exception catching in `model_health.py` and `run_sync.py`. Added unit tests in `tests/test_audit_fixes.py`.
**Fingerprint**: run_sync.py:71 - AttributeError: 'NoneType' object has no attribute 'get'

## 2026-10-13 - Guard optional psutil and requests module usage in server.py
**Learning**: `server.py` imported `psutil` and `requests` inside `try...except ImportError` fallback blocks setting `psutil = None` and `requests = None`, but `get_hermes_status()`, `get_hermes_config_providers()`, `/api/model/test`, and `/api/model/context` accessed `psutil.Process()` and `requests.get()`/`requests.post()` without checking `if psutil is not None` or `if requests is not None`, causing runtime `AttributeError` when those optional packages were absent.
**Action**: Added explicit `if psutil is not None` and `if requests is not None` guards before using `psutil` or making HTTP requests in `server.py`, and added unit tests in `tests/test_audit_fixes.py`.
**Fingerprint**: server.py:515 - AttributeError: 'NoneType' object has no attribute 'Process'
