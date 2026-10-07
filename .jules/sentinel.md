# Sentinel Audit Journal

## 2026-10-04 - Missing import in model health sync runner
**Learning**: `run_sync.py` imported `REPO_DIR` from `paths.py` but failed to import `hermes_config_path`, causing a runtime `NameError` whenever `model_health._api_key()` detected a valid key.
**Action**: Imported `hermes_config_path` in `run_sync.py` and added a regression test in `tests/test_audit_fixes.py`.
**Fingerprint**: run_sync.py:34 - NameError: hermes_config_path

## 2026-10-07 - Optional psutil dependency handling and test suite HTTP server isolation
**Learning**: `server.py` imported `psutil` unconditionally at module scope. In environments without `psutil`, importing `server` failed with `ModuleNotFoundError`, crashing server-dependent unit tests. Additionally, `test_model_connection.py` attempted to connect to port 5174 without launching an in-process server thread.
**Action**: Made `psutil` an optional import with fallback telemetry data in `server.py`. Updated `tests/test_model_connection.py` to spawn a local test server thread on port 0, and reloaded modules in `tests/test_omniroute_logs.py` when overriding path environment variables.
**Fingerprint**: server.py:3 - ModuleNotFoundError: psutil
**Fingerprint**: src/styles/tokens.css:1 - Missing tokens.css stylesheet break build
