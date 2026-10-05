# Sentinel Audit Journal

## 2026-10-04 - Missing import in model health sync runner
**Learning**: `run_sync.py` imported `REPO_DIR` from `paths.py` but failed to import `hermes_config_path`, causing a runtime `NameError` whenever `model_health._api_key()` detected a valid key.
**Action**: Imported `hermes_config_path` in `run_sync.py` and added a regression test in `tests/test_audit_fixes.py`.
**Fingerprint**: run_sync.py:34 - NameError: hermes_config_path

## 2026-10-04 - Telemetry CPU percent sequential zeroing and response header standardization
**Learning**: `server.py` `get_telemetry()` called `psutil.cpu_percent(interval=None)` immediately after calling `psutil.cpu_percent(interval=None, percpu=True)`. Because `psutil` evaluates the delta since the last call, the second call evaluated CPU usage over a ~0s window, persistently returning 0.0 for `cpu_percent`. Deriving overall `cpu_percent` as the average of `per_cpu` ensures accurate non-zero CPU metrics. Also, several `TelemetryHandler` routes lacked standardized JSON response headers and `Content-Length`.
**Action**: Updated `get_telemetry()` to calculate `cpu_pct` from `per_cpu`, standardized JSON endpoints to use `send_json()`, and added regression tests in `tests/test_audit_fixes.py`.
**Fingerprint**: server.py:208 - psutil.cpu_percent sequential zeroing
