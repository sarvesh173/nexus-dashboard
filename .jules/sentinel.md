# Sentinel Audit Log

## Reported Findings Fingerprints
- `server.py:get_hermes_config_providers:UnboundLocalError` (2026-10-03)

## 2026-10-03 - UnboundLocalError in NVIDIA Provider Model Deduplication
**Learning**: In `server.py`, `get_hermes_config_providers()` referenced `existing_ids` when deduplicating `visual_genai_models` without initializing `existing_ids` first. If NVIDIA HTTP API returned 200, this line triggered a `NameError` / `UnboundLocalError`, causing the entire function to fall into the `except` block and report `api_status = 'Unavailable'`.
**Action**: Defined `existing_ids = {m['id'] for m in models_list}` before iterating over `visual_genai_models`.
