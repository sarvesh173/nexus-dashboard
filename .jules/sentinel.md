# Sentinel Audit Journal

## 2026-10-04 - Missing import in model health sync runner
**Learning**: `run_sync.py` imported `REPO_DIR` from `paths.py` but failed to import `hermes_config_path`, causing a runtime `NameError` whenever `model_health._api_key()` detected a valid key.
**Action**: Imported `hermes_config_path` in `run_sync.py` and added a regression test in `tests/test_audit_fixes.py`.
**Fingerprint**: run_sync.py:34 - NameError: hermes_config_path

## 2026-10-06 - Graceful degradation for optional backend dependencies
**Learning**: Backend modules (`server.py`, `model_health.py`, `run_sync.py`) unconditionally imported `psutil`, `requests`, and `yaml`, causing `ModuleNotFoundError` crashes when packages were missing.
**Action**: Wrapped top-level imports in `try...except ImportError` with safe fallback handling and added regression tests in `tests/test_audit_fixes.py`.
**Fingerprint**: server.py:3 - ModuleNotFoundError: psutil / requests / yaml
