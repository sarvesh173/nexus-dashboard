"""Dependency-free SQLite analytics for the OmniRouter call-log schema.

Call logs use TEXT ISO-8601 timestamps, model, duration (milliseconds), status,
and tokens_in/tokens_out/tokens_reasoning counters. Telemetry indexing targets
agent_events(agent_id, timestamp, event_type). Application tables are never
created or migrated; absent call_logs tables produce empty analytics results.
Incompatible schemas and SQLite connection errors are allowed to propagate.

Results are lists of dictionaries. NULL token counters contribute zero, while
NULL model names remain None. tokens_out includes reasoning tokens (the usual
provider usage convention), so total_tokens is input + output; reasoning is
reported separately, not added again. No monetary cost is inferred without a
pricing catalog. Each helper opens and deterministically closes its connection.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from os import PathLike
from typing import Iterator

DBPath = str | PathLike[str]

_PRAGMAS = (
    "PRAGMA busy_timeout=5000",
    "PRAGMA journal_mode=WAL",
    "PRAGMA synchronous=NORMAL",
    "PRAGMA cache_size=-64000",
    "PRAGMA temp_store=MEMORY",
)


@dataclass(frozen=True)
class IndexSpecification:
    """A fixed, compound index definition; identifiers are not caller input."""

    name: str
    table: str
    columns: tuple[str, ...]

    def create_statement(self) -> str:
        columns = ", ".join(_quote_identifier(column) for column in self.columns)
        return (
            f"CREATE INDEX IF NOT EXISTS {_quote_identifier(self.name)} "
            f"ON {_quote_identifier(self.table)} ({columns})"
        )


INDEX_SPECS = (
    IndexSpecification(
        "idx_calls_timestamp_status", "call_logs", ("timestamp", "status")
    ),
    IndexSpecification(
        "idx_calls_model_tokens",
        "call_logs",
        ("model", "tokens_in", "tokens_out", "tokens_reasoning"),
    ),
    IndexSpecification(
        "idx_agent_events", "agent_events", ("agent_id", "timestamp", "event_type")
    ),
)


def _quote_identifier(identifier: str) -> str:
    """SQLite cannot bind identifiers; quote the fixed specification safely."""
    return '"' + identifier.replace('"', '""') + '"'


class QueryOptimizer:
    """Install compatible indexes without creating tables or replacing indexes."""

    @staticmethod
    def ensure_indexes(connection: sqlite3.Connection) -> tuple[str, ...]:
        """Return usable index names, skipping missing tables/columns.

        The caller owns transaction boundaries. Existing names with conflicting
        definitions raise OperationalError instead of silently masking an index
        problem or destructively rebuilding an application-owned index.
        """
        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_schema WHERE type = ?", ("table",)
            )
        }
        existing = dict(connection.execute(
            "SELECT name, tbl_name FROM sqlite_schema WHERE type = ?", ("index",)
        ))
        columns_by_table: dict[str, set[str]] = {}
        usable = []
        for specification in INDEX_SPECS:
            if specification.table not in tables:
                continue
            if specification.table not in columns_by_table:
                columns_by_table[specification.table] = {
                    row[0]
                    for row in connection.execute(
                        "SELECT name FROM pragma_table_info(?)", (specification.table,)
                    )
                }
            if not set(specification.columns) <= columns_by_table[specification.table]:
                continue
            if specification.name not in existing:
                connection.execute(specification.create_statement())
            QueryOptimizer._validate_index(connection, specification)
            usable.append(specification.name)
        return tuple(usable)

    @staticmethod
    def _validate_index(
        connection: sqlite3.Connection, specification: IndexSpecification
    ) -> None:
        index = connection.execute(
            "SELECT tbl_name FROM sqlite_schema WHERE type = ? AND name = ?",
            ("index", specification.name),
        ).fetchone()
        columns = tuple(
            row[0]
            for row in connection.execute(
                "SELECT name FROM pragma_index_info(?) ORDER BY seqno",
                (specification.name,),
            )
        )
        partial = connection.execute(
            "SELECT partial FROM pragma_index_list(?) WHERE name = ?",
            (specification.table, specification.name),
        ).fetchone()
        if (
            index is None
            or index[0] != specification.table
            or columns != specification.columns
            or partial is None
            or partial[0]
        ):
            raise sqlite3.OperationalError(
                f"Index {specification.name!r} conflicts with its analytics specification"
            )


class ConnectionManager:
    """Independent, tuned connections with commit/rollback and reliable cleanup.

    Compatible indexes are initialized on entry. File databases use WAL;
    SQLite necessarily retains journal_mode=memory for in-memory databases.
    The context commits successful work and rolls back failed transactions.
    """

    def __init__(self, db_path: DBPath):
        self.db_path = db_path

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.db_path, timeout=5.0)
        try:
            connection.row_factory = sqlite3.Row
            for statement in _PRAGMAS:
                connection.execute(statement)
            QueryOptimizer.ensure_indexes(connection)
            with connection:
                yield connection
        finally:
            connection.close()


_HOURLY_SQL = """
WITH hourly AS (
    SELECT strftime('%Y-%m-%dT%H:00:00Z', timestamp) AS hour,
           COUNT(*) AS call_count,
           SUM(COALESCE(tokens_in, 0)) AS tokens_in,
           SUM(COALESCE(tokens_out, 0)) AS tokens_out,
           SUM(COALESCE(tokens_reasoning, 0)) AS tokens_reasoning
    FROM call_logs
    WHERE timestamp >= ? AND timestamp < ?
      AND julianday(timestamp) >= julianday(?)
      AND julianday(timestamp) <= julianday(?)
    GROUP BY hour
)
SELECT hour, call_count, tokens_in, tokens_out, tokens_reasoning,
       tokens_in + tokens_out AS total_tokens,
       SUM(tokens_in + tokens_out) OVER (
           ORDER BY hour ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS cumulative_tokens
FROM hourly
ORDER BY hour
"""

_MODEL_COST_SQL = """
SELECT model, COUNT(*) AS call_count,
       SUM(COALESCE(tokens_in, 0)) AS tokens_in,
       SUM(COALESCE(tokens_out, 0)) AS tokens_out,
       SUM(COALESCE(tokens_reasoning, 0)) AS tokens_reasoning,
       SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)) AS total_tokens
FROM call_logs
GROUP BY model
ORDER BY total_tokens DESC, model
"""

_P95_LATENCY_SQL = """
WITH ranked AS (
    SELECT model, duration,
           ROW_NUMBER() OVER (PARTITION BY model ORDER BY duration) AS latency_rank,
           COUNT(*) OVER (PARTITION BY model) AS sample_count
    FROM call_logs
    WHERE duration >= 0 AND typeof(duration) IN ('integer', 'real')
)
SELECT model, duration AS p95_latency_ms, sample_count
FROM ranked
WHERE latency_rank = (95 * sample_count + 99) / 100
ORDER BY model
"""


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _hourly_parameters(hours: int) -> tuple[str, str, str, str]:
    if isinstance(hours, bool) or not isinstance(hours, int) or hours <= 0:
        raise ValueError("hours must be a positive integer")
    now = _utc_now()
    try:
        cutoff = now - timedelta(hours=hours)
        # The indexed lexical prefilter includes adjacent dates to accommodate
        # ISO offsets and both 'T' and space separators. julianday then applies
        # the exact UTC window, excluding malformed and future timestamps.
        lower_date = (cutoff - timedelta(days=1)).date().isoformat()
        upper_date = (now + timedelta(days=2)).date().isoformat()
    except OverflowError as error:
        raise ValueError("hours exceeds the supported datetime range") from error
    return lower_date, upper_date, cutoff.isoformat(), now.isoformat()


def _fetch_rows(
    db_path: DBPath, statement: str, parameters: tuple = ()
) -> list[dict]:
    with ConnectionManager(db_path).connect() as connection:
        table = connection.execute(
            "SELECT 1 FROM sqlite_schema WHERE type = ? AND name = ?",
            ("table", "call_logs"),
        ).fetchone()
        if table is None:
            return []
        return [dict(row) for row in connection.execute(statement, parameters)]


def get_token_burn_hourly(db_path: DBPath, hours: int = 24) -> list[dict]:
    """Return occupied UTC buckets in the trailing `hours`, oldest first.

    Both endpoints of the exact window are inclusive. A sliding window can
    touch hours + 1 buckets; gaps are omitted rather than fabricated as data.
    Each row contains hour, call_count, tokens_in, tokens_out, tokens_reasoning,
    total_tokens (tokens/hour for that bucket), and the window-function-derived
    cumulative_tokens. NULL/invalid timestamps and future clock drift are
    excluded. Invalid hours raise ValueError before opening the database.
    """
    return _fetch_rows(db_path, _HOURLY_SQL, _hourly_parameters(hours))


def get_model_cost_breakdown(db_path: DBPath) -> list[dict]:
    """Return lifetime per-model usage, ordered by total token usage descending.

    Rows contain model, call_count, tokens_in, tokens_out, tokens_reasoning,
    and total_tokens. These are cost inputs, not fabricated monetary amounts.
    """
    return _fetch_rows(db_path, _MODEL_COST_SQL)


def get_p95_latency_by_model(db_path: DBPath) -> list[dict]:
    """Return model, p95_latency_ms, and sample_count for valid latency samples.

    SQLite window functions approximate the quantile using nearest rank:
    ceil(0.95 * sample_count), with no optional percentile extension needed.
    NULL, negative, and nonnumeric durations are excluded; zero is valid.
    """
    return _fetch_rows(db_path, _P95_LATENCY_SQL)
