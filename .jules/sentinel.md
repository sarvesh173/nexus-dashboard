# Sentinel Audit Journal

## 2026-10-04 - Missing import in model health sync runner
**Learning**: `run_sync.py` imported `REPO_DIR` from `paths.py` but failed to import `hermes_config_path`, causing a runtime `NameError` whenever `model_health._api_key()` detected a valid key.
**Action**: Imported `hermes_config_path` in `run_sync.py` and added a regression test in `tests/test_audit_fixes.py`.
**Fingerprint**: run_sync.py:34 - NameError: hermes_config_path

## 2026-10-08 - ModuleNotFoundError for requests and psutil in backend modules
**Learning**: `model_health.py`, `server.py`, and `run_sync.py` depended on `requests` and `psutil`, causing runtime `ModuleNotFoundError` crashes when external packages were missing.
**Action**: Replaced `requests` with standard library `urllib.request` across backend modules, made `psutil` optional with fallback telemetry, and added regression tests in `tests/test_audit_fixes.py`.
**Fingerprint**: model_health.py:26 - ModuleNotFoundError: requests
