# Sentinel Audit Journal

## 2026-10-04 - Missing import in model health sync runner
**Learning**: `run_sync.py` imported `REPO_DIR` from `paths.py` but failed to import `hermes_config_path`, causing a runtime `NameError` whenever `model_health._api_key()` detected a valid key.
**Action**: Imported `hermes_config_path` in `run_sync.py` and added a regression test in `tests/test_audit_fixes.py`.
**Fingerprint**: run_sync.py:34 - NameError: hermes_config_path

## 2026-10-07 - Unguarded top-level imports of psutil, requests, and yaml
**Learning**: `server.py`, `model_health.py`, and `run_sync.py` imported `psutil`, `requests`, and `yaml` unconditionally at top level. In standard Python environments missing third-party packages, importing `server` or `model_health` failed with `ModuleNotFoundError`, crashing server startup and test suites.
**Action**: Wrapped `psutil`, `requests`, and `yaml` imports in `try...except ImportError` blocks with `urllib.request` standard library fallbacks and guarded system telemetry.
**Fingerprint**: server.py:3 - ModuleNotFoundError: psutil / requests
