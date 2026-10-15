"""Shared shape guard for provider /models catalogue responses.

Every producer in this repo asks a provider for its catalogue with a slightly
different HTTP client (requests in server.py/model_health.py/run_sync.py,
urllib in live_sync.py) but the payload shapes are identical:

    {"data": [{"id": "vendor/model", ...}, ...]}   the documented shape
    [{"id": "vendor/model", ...}]                  a proxy may answer with this
    anything else                                  error pages, HTML, null

One odd shape used to raise at .get()/.lower() and blank the entire catalog,
because the shape was assumed at the point of use. model_rows() normalises any
of those into a list of (id, row) pairs with non-empty string ids, skipping
junk rows. It never raises.
"""


def model_rows(payload):
    """Normalise a /models response body into [(model_id, row_dict), ...].

    Accepts {"data": [...]} or a top-level list. Rows that are not dicts, or
    whose "id" is not a non-empty string, are skipped rather than crashing the
    caller. A non-list/non-dict payload yields [].
    """
    if isinstance(payload, dict):
        rows = payload.get('data')
    else:
        rows = payload
    if not isinstance(rows, list):
        return []
    out = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        mid = row.get('id')
        if isinstance(mid, str) and mid:
            out.append((mid, row))
    return out
