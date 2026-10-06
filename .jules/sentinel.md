# Sentinel Audit Journal

## 2026-10-04 - Missing import in model health sync runner
**Learning**: `run_sync.py` imported `REPO_DIR` from `paths.py` but failed to import `hermes_config_path`, causing a runtime `NameError` whenever `model_health._api_key()` detected a valid key.
**Action**: Imported `hermes_config_path` in `run_sync.py` and added a regression test in `tests/test_audit_fixes.py`.
**Fingerprint**: run_sync.py:34 - NameError: hermes_config_path

## 2026-10-05 - Missing third-party module crashes on default environments
**Learning**: Backend modules (`server.py`, `model_health.py`, `run_sync.py`) imported optional third-party modules (`requests`, `psutil`, `yaml`) at top level, crashing with `ModuleNotFoundError` when run in minimalist environments or standard unit test runners.
**Action**: Added `try/except` import guards and standard library fallbacks (`urllib.request`, `/proc/meminfo`, `os.statvfs`, and JSON parsing fallback) and updated unit tests to handle missing dependencies/offline servers gracefully.
**Fingerprint**: server.py:3 - ModuleNotFoundError: psutil / requests
