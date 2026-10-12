# Sentinel Audit Journal

## 2026-10-04 - Missing import in model health sync runner
**Learning**: `run_sync.py` imported `REPO_DIR` from `paths.py` but failed to import `hermes_config_path`, causing a runtime `NameError` whenever `model_health._api_key()` detected a valid key.
**Action**: Imported `hermes_config_path` in `run_sync.py` and added a regression test in `tests/test_audit_fixes.py`.
**Fingerprint**: run_sync.py:34 - NameError: hermes_config_path

## 2026-10-05 - Unhandled optional requests package
**Learning**: Backend modules (`server.py`, `model_health.py`, `run_sync.py`) imported `requests` conditionally (`requests = None` on `ImportError`), but called `requests.get/post` and referenced `requests.Timeout` directly without checking if `requests` was non-null, causing `AttributeError` in environments without `requests`.
**Action**: Added `if requests is None` guards and replaced direct `requests.Timeout` exception handling with string-based exception inspection (`'Timeout' in type(exc).__name__`).
**Fingerprint**: server.py:939 - AttributeError: 'NoneType' object has no attribute 'get' / model_health.py:170 - AttributeError: 'NoneType' object has no attribute 'Timeout'
