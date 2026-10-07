#!/usr/bin/env python3
"""Offline analytics tests. Run: python3 tests/test_analytics_engine.py.

Only temporary databases are used. The clock is fixed; neither credentials,
network access, percentile extensions, nor third-party packages are required.
"""

import sqlite3
import sys
import tempfile
import unittest
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.db import analytics_engine as analytics  # noqa: E402

NOW = datetime(2026, 10, 6, 12, 30, tzinfo=timezone.utc)

_CALL_SCHEMA = """
CREATE TABLE IF NOT EXISTS call_logs (
    id INTEGER PRIMARY KEY,
    timestamp TEXT,
    status INTEGER,
    model TEXT,
    duration INTEGER,
    tokens_in INTEGER,
    tokens_out INTEGER,
    tokens_reasoning INTEGER
)
"""


class AnalyticsTestCase(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="nexus-analytics-test-")
        self.addCleanup(temporary.cleanup)
        self.db_path = Path(temporary.name) / "storage.sqlite"
        clock = mock.patch.object(analytics, "_utc_now", return_value=NOW)
        clock.start()
        self.addCleanup(clock.stop)

    @contextmanager
    def raw_connection(self):
        connection = sqlite3.connect(self.db_path)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def seed_calls(self, *calls):
        rows = [
            (
                call.get("timestamp", NOW.isoformat()),
                call.get("status", 200),
                call.get("model", "model-a"),
                call.get("duration", 0),
                call.get("tokens_in", 0),
                call.get("tokens_out", 0),
                call.get("tokens_reasoning", None),
            )
            for call in calls
        ]
        with self.raw_connection() as connection:
            connection.execute(_CALL_SCHEMA)
            connection.executemany(
                "INSERT INTO call_logs (timestamp, status, model, duration, "
                "tokens_in, tokens_out, tokens_reasoning) VALUES (?, ?, ?, ?, ?, ?, ?)",
                rows,
            )

    def seed_events(self):
        with self.raw_connection() as connection:
            connection.execute(
                "CREATE TABLE agent_events "
                "(agent_id TEXT, timestamp TEXT, event_type TEXT)"
            )
            connection.execute(
                "INSERT INTO agent_events VALUES (?, ?, ?)",
                ("agent-a", NOW.isoformat(), "call_finished"),
            )


class TestConnectionManager(AnalyticsTestCase):
    def test_file_database_has_all_requested_pragmas(self):
        expected = {
            "journal_mode": "wal",
            "synchronous": 1,
            "cache_size": -64000,
            "temp_store": 2,
            "busy_timeout": 5000,
        }
        with analytics.ConnectionManager(self.db_path).connect() as connection:
            for pragma, value in expected.items():
                with self.subTest(pragma=pragma):
                    actual = connection.execute("PRAGMA " + pragma).fetchone()[0]
                    self.assertEqual(actual, value)
        with self.raw_connection() as connection:
            self.assertEqual(connection.execute("PRAGMA journal_mode").fetchone()[0], "wal")

    def test_connection_local_pragmas_are_initialized_on_every_open(self):
        manager = analytics.ConnectionManager(self.db_path)
        with manager.connect() as connection:
            connection.execute("PRAGMA cache_size=32")
            connection.execute("PRAGMA synchronous=OFF")
        with manager.connect() as connection:
            self.assertEqual(connection.execute("PRAGMA cache_size").fetchone()[0], -64000)
            self.assertEqual(connection.execute("PRAGMA synchronous").fetchone()[0], 1)

    def test_success_commits_and_closes_the_connection(self):
        self.seed_calls()
        with analytics.ConnectionManager(self.db_path).connect() as connection:
            connection.execute("INSERT INTO call_logs (model) VALUES (?)", ("saved",))
        with self.assertRaises(sqlite3.ProgrammingError):
            connection.execute("SELECT 1")
        with self.raw_connection() as reopened:
            self.assertEqual(reopened.execute("SELECT model FROM call_logs").fetchone()[0], "saved")

    def test_failure_rolls_back_and_closes_the_connection(self):
        self.seed_calls()
        with self.assertRaisesRegex(RuntimeError, "abort"):
            with analytics.ConnectionManager(self.db_path).connect() as connection:
                connection.execute("INSERT INTO call_logs (model) VALUES (?)", ("lost",))
                raise RuntimeError("abort")
        with self.assertRaises(sqlite3.ProgrammingError):
            connection.execute("SELECT 1")
        with self.raw_connection() as reopened:
            self.assertEqual(reopened.execute("SELECT COUNT(*) FROM call_logs").fetchone()[0], 0)

    def test_wal_reader_keeps_snapshot_while_writer_commits(self):
        self.seed_calls({"tokens_in": 1})
        manager = analytics.ConnectionManager(self.db_path)
        with manager.connect() as reader:
            reader.execute("BEGIN")
            self.assertEqual(reader.execute("SELECT COUNT(*) FROM call_logs").fetchone()[0], 1)
            with manager.connect() as writer:
                writer.execute("INSERT INTO call_logs (model) VALUES (?)", ("new",))
            self.assertEqual(reader.execute("SELECT COUNT(*) FROM call_logs").fetchone()[0], 1)
            reader.commit()
            self.assertEqual(reader.execute("SELECT COUNT(*) FROM call_logs").fetchone()[0], 2)

    def test_memory_database_retains_sqlite_memory_journal(self):
        with analytics.ConnectionManager(":memory:").connect() as connection:
            self.assertEqual(connection.execute("PRAGMA journal_mode").fetchone()[0], "memory")
            self.assertEqual(connection.execute("PRAGMA cache_size").fetchone()[0], -64000)


class TestQueryOptimizer(AnalyticsTestCase):
    def test_compound_indexes_match_the_specifications(self):
        self.seed_calls()
        self.seed_events()
        with self.raw_connection() as connection:
            names = analytics.QueryOptimizer.ensure_indexes(connection)
            self.assertEqual(names, tuple(spec.name for spec in analytics.INDEX_SPECS))
            for specification in analytics.INDEX_SPECS:
                columns = tuple(row[0] for row in connection.execute(
                    "SELECT name FROM pragma_index_info(?) ORDER BY seqno",
                    (specification.name,),
                ))
                self.assertEqual(columns, specification.columns)

    def test_manager_automatically_installs_indexes_idempotently(self):
        self.seed_calls()
        with analytics.ConnectionManager(self.db_path).connect() as connection:
            before = connection.execute("PRAGMA schema_version").fetchone()[0]
            names = analytics.QueryOptimizer.ensure_indexes(connection)
            self.assertEqual(names, ("idx_calls_timestamp_status", "idx_calls_model_tokens"))
            self.assertEqual(connection.execute("PRAGMA schema_version").fetchone()[0], before)

    def test_absent_tables_and_missing_columns_are_not_created_or_migrated(self):
        with self.raw_connection() as connection:
            self.assertEqual(analytics.QueryOptimizer.ensure_indexes(connection), ())
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM sqlite_schema").fetchone()[0], 0)
            connection.execute("CREATE TABLE call_logs (timestamp TEXT, model TEXT)")
            self.assertEqual(analytics.QueryOptimizer.ensure_indexes(connection), ())
            columns = [row[0] for row in connection.execute(
                "SELECT name FROM pragma_table_info(?)", ("call_logs",)
            )]
            self.assertEqual(columns, ["timestamp", "model"])

    def test_telemetry_table_is_indexed_without_call_logs(self):
        self.seed_events()
        with self.raw_connection() as connection:
            self.assertEqual(analytics.QueryOptimizer.ensure_indexes(connection), ("idx_agent_events",))

    def test_conflicting_index_is_rejected_without_being_replaced(self):
        self.seed_calls()
        with self.raw_connection() as connection:
            connection.execute("CREATE INDEX idx_calls_timestamp_status ON call_logs (model)")
            with self.assertRaisesRegex(sqlite3.OperationalError, "conflicts"):
                analytics.QueryOptimizer.ensure_indexes(connection)
            columns = [row[0] for row in connection.execute(
                "SELECT name FROM pragma_index_info(?)", ("idx_calls_timestamp_status",)
            )]
            self.assertEqual(columns, ["model"])

    def test_partial_index_does_not_masquerade_as_a_full_analytics_index(self):
        self.seed_calls()
        with self.raw_connection() as connection:
            connection.execute(
                "CREATE INDEX idx_calls_timestamp_status ON call_logs "
                "(timestamp, status) WHERE status = 200"
            )
            with self.assertRaisesRegex(sqlite3.OperationalError, "conflicts"):
                analytics.QueryOptimizer.ensure_indexes(connection)

    def test_real_aggregation_plans_use_timestamp_and_covering_token_indexes(self):
        self.seed_calls(*({"tokens_in": number} for number in range(100)))
        with analytics.ConnectionManager(self.db_path).connect() as connection:
            hourly = " ".join(row[3] for row in connection.execute(
                "EXPLAIN QUERY PLAN " + analytics._HOURLY_SQL,
                analytics._hourly_parameters(24),
            ))
            costs = " ".join(row[3] for row in connection.execute(
                "EXPLAIN QUERY PLAN " + analytics._MODEL_COST_SQL
            ))
        self.assertIn("SEARCH call_logs USING INDEX idx_calls_timestamp_status", hourly)
        self.assertIn("USING COVERING INDEX idx_calls_model_tokens", costs)


class TestHourlyBurn(AnalyticsTestCase):
    def test_hourly_totals_and_window_cumulative_burn(self):
        self.seed_calls(
            {"timestamp": "2026-10-06T12:10:00Z", "tokens_in": 5},
            {"timestamp": "2026-10-06T11:45:00Z", "tokens_in": 60,
             "tokens_out": 20, "tokens_reasoning": 10},
            {"timestamp": "2026-10-06T10:15:00Z", "tokens_in": 100,
             "tokens_out": 20, "tokens_reasoning": 5},
            {"timestamp": "2026-10-06T11:05:00Z", "tokens_in": 40,
             "tokens_out": 10, "status": 429},
        )
        self.assertEqual(analytics.get_token_burn_hourly(self.db_path, hours=3), [
            {"hour": "2026-10-06T10:00:00Z", "call_count": 1, "tokens_in": 100,
             "tokens_out": 20, "tokens_reasoning": 5, "total_tokens": 120,
             "cumulative_tokens": 120},
            {"hour": "2026-10-06T11:00:00Z", "call_count": 2, "tokens_in": 100,
             "tokens_out": 30, "tokens_reasoning": 10, "total_tokens": 130,
             "cumulative_tokens": 250},
            {"hour": "2026-10-06T12:00:00Z", "call_count": 1, "tokens_in": 5,
             "tokens_out": 0, "tokens_reasoning": 0, "total_tokens": 5,
             "cumulative_tokens": 255},
        ])

    def test_null_counters_contribute_zero_without_dropping_calls(self):
        self.seed_calls(
            {"tokens_in": None, "tokens_out": None, "tokens_reasoning": None},
            {"tokens_in": 7, "tokens_out": None, "tokens_reasoning": 2},
        )
        row = analytics.get_token_burn_hourly(self.db_path)[0]
        self.assertEqual(row["call_count"], 2)
        self.assertEqual((row["tokens_in"], row["tokens_out"], row["tokens_reasoning"]), (7, 0, 2))
        self.assertEqual(row["total_tokens"], 7)
        self.assertEqual(row["cumulative_tokens"], 7)

    def test_gaps_are_omitted_and_do_not_reset_cumulative_burn(self):
        self.seed_calls(
            {"timestamp": "2026-10-06T09:45:00Z", "tokens_out": 3},
            {"timestamp": "2026-10-06T12:00:00Z", "tokens_out": 4},
        )
        rows = analytics.get_token_burn_hourly(self.db_path, hours=3)
        self.assertEqual([row["hour"] for row in rows],
                         ["2026-10-06T09:00:00Z", "2026-10-06T12:00:00Z"])
        self.assertEqual([row["cumulative_tokens"] for row in rows], [3, 7])


class TestHourlyTimeWindow(AnalyticsTestCase):
    def test_exact_cutoff_and_now_are_included_but_future_drift_is_not(self):
        cutoff = NOW - timedelta(hours=2)
        self.seed_calls(
            {"timestamp": (cutoff - timedelta(milliseconds=1)).isoformat(), "tokens_in": 100},
            {"timestamp": cutoff.isoformat(), "tokens_in": 3},
            {"timestamp": NOW.isoformat(), "tokens_in": 7},
            {"timestamp": (NOW + timedelta(milliseconds=1)).isoformat(), "tokens_in": 1000},
        )
        rows = analytics.get_token_burn_hourly(self.db_path, hours=2)
        self.assertEqual(sum(row["call_count"] for row in rows), 2)
        self.assertEqual(rows[-1]["cumulative_tokens"], 10)

    def test_default_window_is_twenty_four_hours(self):
        self.seed_calls(
            {"timestamp": (NOW - timedelta(hours=23)).isoformat(), "tokens_in": 2},
            {"timestamp": (NOW - timedelta(hours=25)).isoformat(), "tokens_in": 100},
            {"timestamp": (NOW + timedelta(days=2)).isoformat(), "tokens_in": 1000},
        )
        rows = analytics.get_token_burn_hourly(self.db_path)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["total_tokens"], 2)

    def test_offset_timestamps_across_dates_and_sqlite_format_normalize_to_utc(self):
        self.seed_calls(
            {"timestamp": "2026-10-07T01:15:00+14:00", "tokens_in": 1},
            {"timestamp": "2026-10-05T23:45:00-12:00", "tokens_in": 2},
            {"timestamp": "2026-10-06 11:30:00", "tokens_in": 3},
        )
        rows = analytics.get_token_burn_hourly(self.db_path, hours=2)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["hour"], "2026-10-06T11:00:00Z")
        self.assertEqual(rows[0]["call_count"], 3)
        self.assertEqual(rows[0]["total_tokens"], 6)

    def test_invalid_or_missing_timestamps_are_ignored(self):
        self.seed_calls(
            {"timestamp": None, "tokens_in": 100},
            {"timestamp": "2026-10-06not-a-time", "tokens_in": 100},
            {"timestamp": "not-a-date", "tokens_in": 100},
            {"tokens_in": 5},
        )
        rows = analytics.get_token_burn_hourly(self.db_path)
        self.assertEqual(rows[0]["call_count"], 1)
        self.assertEqual(rows[0]["total_tokens"], 5)

    def test_invalid_hours_and_sql_injection_are_rejected(self):
        self.seed_calls({"tokens_in": 1})
        for invalid in (0, -1, True, 1.5, "24", None, "1); DROP TABLE call_logs; --"):
            with self.subTest(hours=invalid):
                with self.assertRaises(ValueError):
                    analytics.get_token_burn_hourly(self.db_path, hours=invalid)
        self.assertEqual(analytics.get_model_cost_breakdown(self.db_path)[0]["call_count"], 1)

    def test_datetime_overflow_is_a_validation_error_without_database_side_effects(self):
        with self.assertRaisesRegex(ValueError, "datetime range"):
            analytics.get_token_burn_hourly(self.db_path, hours=10 ** 30)
        self.assertFalse(self.db_path.exists())


class TestModelCostBreakdown(AnalyticsTestCase):
    def test_per_model_usage_and_all_token_categories(self):
        self.seed_calls(
            {"model": "model-a", "tokens_in": 100, "tokens_out": 20, "tokens_reasoning": 5},
            {"model": "model-b", "tokens_in": 20, "tokens_out": 40, "tokens_reasoning": 30},
            {"model": "model-a", "tokens_in": 40, "tokens_out": 10, "status": 500},
            {"model": "model-a", "tokens_in": None, "tokens_out": None},
        )
        self.assertEqual(analytics.get_model_cost_breakdown(self.db_path), [
            {"model": "model-a", "call_count": 3, "tokens_in": 140, "tokens_out": 30,
             "tokens_reasoning": 5, "total_tokens": 170},
            {"model": "model-b", "call_count": 1, "tokens_in": 20, "tokens_out": 40,
             "tokens_reasoning": 30, "total_tokens": 60},
        ])

    def test_null_model_is_not_merged_with_a_literal_unknown_model(self):
        self.seed_calls(
            {"model": None, "tokens_in": 3},
            {"model": "unknown", "tokens_in": 1},
        )
        rows = analytics.get_model_cost_breakdown(self.db_path)
        self.assertEqual([row["model"] for row in rows], [None, "unknown"])
        self.assertEqual([row["total_tokens"] for row in rows], [3, 1])

    def test_all_null_counters_return_measured_call_count_and_zero_totals(self):
        self.seed_calls({"tokens_in": None, "tokens_out": None, "tokens_reasoning": None})
        self.assertEqual(analytics.get_model_cost_breakdown(self.db_path), [
            {"model": "model-a", "call_count": 1, "tokens_in": 0, "tokens_out": 0,
             "tokens_reasoning": 0, "total_tokens": 0},
        ])

    def test_sql_shaped_model_name_is_preserved_as_data(self):
        model = "model'); DROP TABLE call_logs; --"
        self.seed_calls({"model": model, "tokens_in": 11})
        row = analytics.get_model_cost_breakdown(self.db_path)[0]
        self.assertEqual(row["model"], model)
        self.assertEqual(row["total_tokens"], 11)
        with self.raw_connection() as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM call_logs").fetchone()[0], 1)


class TestP95Latency(AnalyticsTestCase):
    def test_nearest_rank_for_each_model_without_percentile_extension(self):
        self.seed_calls(
            *({"model": "model-a", "duration": value} for value in range(100, 0, -1)),
            *({"model": "model-b", "duration": value} for value in (40, 10, 30, 20)),
        )
        self.assertEqual(analytics.get_p95_latency_by_model(self.db_path), [
            {"model": "model-a", "p95_latency_ms": 95, "sample_count": 100},
            {"model": "model-b", "p95_latency_ms": 40, "sample_count": 4},
        ])

    def test_twenty_samples_do_not_round_up_to_the_maximum(self):
        self.seed_calls(*({"duration": value} for value in range(1, 21)))
        self.assertEqual(analytics.get_p95_latency_by_model(self.db_path), [
            {"model": "model-a", "p95_latency_ms": 19, "sample_count": 20},
        ])

    def test_single_sample_zero_fractional_values_and_ties(self):
        self.seed_calls(
            {"model": "zero", "duration": 0},
            {"model": "fractional", "duration": 12.5},
            *({"model": "ties", "duration": 5} for _ in range(19)),
            {"model": "ties", "duration": 999},
        )
        self.assertEqual(analytics.get_p95_latency_by_model(self.db_path), [
            {"model": "fractional", "p95_latency_ms": 12.5, "sample_count": 1},
            {"model": "ties", "p95_latency_ms": 5, "sample_count": 20},
            {"model": "zero", "p95_latency_ms": 0, "sample_count": 1},
        ])

    def test_null_negative_and_nonnumeric_latencies_do_not_inflate_sample_count(self):
        self.seed_calls(
            {"duration": None}, {"duration": -1}, {"duration": "invalid"},
            {"duration": 0}, {"duration": 2}, {"duration": 1},
            {"model": "no-samples", "duration": None},
        )
        self.assertEqual(analytics.get_p95_latency_by_model(self.db_path), [
            {"model": "model-a", "p95_latency_ms": 2, "sample_count": 3},
        ])

    def test_all_invalid_latencies_produce_no_percentile(self):
        self.seed_calls({"duration": None}, {"duration": -5})
        self.assertEqual(analytics.get_p95_latency_by_model(self.db_path), [])

    def test_null_model_retains_its_own_percentile_group(self):
        self.seed_calls({"model": None, "duration": 8}, {"model": None, "duration": 2})
        self.assertEqual(analytics.get_p95_latency_by_model(self.db_path), [
            {"model": None, "p95_latency_ms": 8, "sample_count": 2},
        ])


class TestEmptyDatabase(AnalyticsTestCase):
    def test_new_database_returns_empty_results_without_creating_application_tables(self):
        for function in (analytics.get_token_burn_hourly, analytics.get_model_cost_breakdown,
                         analytics.get_p95_latency_by_model):
            with self.subTest(function=function.__name__):
                self.assertEqual(function(self.db_path), [])
        with self.raw_connection() as connection:
            self.assertEqual(connection.execute(
                "SELECT COUNT(*) FROM sqlite_schema WHERE type = ?", ("table",)
            ).fetchone()[0], 0)

    def test_existing_empty_call_table_returns_empty_results(self):
        self.seed_calls()
        self.assertEqual(analytics.get_token_burn_hourly(self.db_path), [])
        self.assertEqual(analytics.get_model_cost_breakdown(self.db_path), [])
        self.assertEqual(analytics.get_p95_latency_by_model(self.db_path), [])

    def test_malformed_existing_schema_is_not_silently_treated_as_empty(self):
        with self.raw_connection() as connection:
            connection.execute("CREATE TABLE call_logs (timestamp TEXT)")
        for function in (analytics.get_token_burn_hourly, analytics.get_model_cost_breakdown,
                         analytics.get_p95_latency_by_model):
            with self.subTest(function=function.__name__):
                with self.assertRaises(sqlite3.OperationalError):
                    function(self.db_path)


if __name__ == "__main__":
    unittest.main(verbosity=2)
