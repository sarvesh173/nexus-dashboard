# Sentinel Ledger

## Reported Findings
- server.py:get_hermes_config_providers - NameError: existing_ids

## 2026-10-02 - Unhandled NameError in server.py provider catalog assembly
**Learning**: In `get_hermes_config_providers()` in `server.py`, `existing_ids` was referenced before definition when appending `visual_genai_models` to `models_list`, causing an unhandled `NameError` crash whenever `/api/providers` endpoint was queried and NVIDIA model fetching succeeded.
**Action**: Define `existing_ids = {m['id'] for m in models_list}` before deduplicating and appending `visual_genai_models`.
