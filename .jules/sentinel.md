# Sentinel Audit Journal

## 2026-10-04 - Missing import in model health sync runner
**Learning**: `run_sync.py` imported `REPO_DIR` from `paths.py` but failed to import `hermes_config_path`, causing a runtime `NameError` whenever `model_health._api_key()` detected a valid key.
**Action**: Imported `hermes_config_path` in `run_sync.py` and added a regression test in `tests/test_audit_fixes.py`.
**Fingerprint**: run_sync.py:34 - NameError: hermes_config_path

## 2026-10-11 - Graceful import fallbacks for optional backend packages
**Learning**: `server.py`, `model_health.py`, and `run_sync.py` imported `psutil`, `yaml`, and `requests` at module top-level without `try...except ImportError`, causing load-time crashes in environments where those optional packages were missing.
**Action**: Wrapped top-level imports in `try...except ImportError` blocks with safe fallback handling across backend functions and endpoints.
**Fingerprint**: server.py:3 - ModuleNotFoundError: psutil / requests / yaml
