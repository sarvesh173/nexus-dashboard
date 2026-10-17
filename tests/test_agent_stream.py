#!/usr/bin/env python3
"""Offline tests for the live agent observability layer.

Covers agent_stream.py's pure formatting/normalisation helpers and its
degradation behaviour when a store is missing. No database, no network, no
credentials: every store here is either absent (monkeypatched) or synthesised,
so this suite passes on a machine that has neither the opencode CLI nor
OmniRoute installed.

Run: python3 tests/test_agent_stream.py
"""
import json
import os
import sqlite3
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import agent_stream as a  # noqa: E402


class TestFormatModel(unittest.TestCase):
    """The badge format is a contract: provider/model:variant."""

    def test_json_blob_from_session_row(self):
        self.assertEqual(
            a.format_model(
                '{"id":"space-bunny-free","providerID":"opencode","variant":"max"}'
            ),
            'opencode/space-bunny-free:max',
        )

    def test_mapping_from_assistant_message(self):
        self.assertEqual(
            a.format_model({
                'modelID': 'space-bunny-free',
                'providerID': 'opencode',
                'variant': 'max',
            }),
            'opencode/space-bunny-free:max',
        )

    def test_bare_model_id_keeps_its_shape(self):
        # A bare id must not become {} and then an empty badge.
        self.assertEqual(a.format_model('gpt-6-astra', variant='max'), 'gpt-6-astra:max')

    def test_provider_arg_prefixes(self):
        self.assertEqual(
            a.format_model({'modelID': 'gemini-3.8-flash-high'}, provider='agy'),
            'agy/gemini-3.8-flash-high',
        )

    def test_slashed_id_is_not_double_prefixed(self):
        self.assertEqual(
            a.format_model('deepseek-ai/deepseek-v4.1-flash', provider='nvidia'),
            'deepseek-ai/deepseek-v4.1-flash',
        )

    def test_missing_model_is_empty_not_placeholder(self):
        # '--' is a UI concern; the data layer must return nothing so the view
        # can tell "no model recorded" from "model id is literally --".
        self.assertEqual(a.format_model(None), '')
        self.assertEqual(a.format_model(''), '')
        self.assertEqual(a.format_model({}), '')

    def test_unparseable_json_does_not_raise(self):
        self.assertEqual(a.format_model('{not json'), '{not json')


class TestClip(unittest.TestCase):
    def test_whitespace_collapsed(self):
        self.assertEqual(a._clip('a  b\n\tc'), 'a b c')

    def test_truncation_adds_ellipsis_and_respects_limit(self):
        out = a._clip('x' * 400)
        self.assertEqual(len(out), 240)
        self.assertTrue(out.endswith('…'))

    def test_short_text_untouched(self):
        self.assertEqual(a._clip('short'), 'short')

    def test_non_string_is_empty(self):
        self.assertEqual(a._clip(None), '')
        self.assertEqual(a._clip(42), '')


class TestRelativeDirectory(unittest.TestCase):
    def test_only_last_segment(self):
        # A dashboard must not render somebody's home directory.
        self.assertEqual(a._rel_dir('/home/someone/nexus-dashboard'), 'nexus-dashboard')

    def test_missing_is_empty(self):
        self.assertEqual(a._rel_dir(None), '')
        self.assertEqual(a._rel_dir(''), '')


class TestToolDetail(unittest.TestCase):
    def test_prefers_command(self):
        self.assertEqual(a._tool_detail('bash', {'command': 'ls -la'}), 'ls -la')

    def test_falls_back_to_path(self):
        self.assertEqual(a._tool_detail('read', {'filePath': '/x/y.js'}), '/x/y.js')

    def test_non_dict_input_is_empty(self):
        self.assertEqual(a._tool_detail('bash', 'notadict'), '')

    def test_files_extracted(self):
        self.assertEqual(a._tool_files({'filePath': '/a.js'}), ['/a.js'])
        self.assertEqual(a._tool_files('notadict'), [])


class TestDegradation(unittest.TestCase):
    """An absent store is a STATE, reported with a reason - never an exception."""

    def setUp(self):
        self._real_active = a.opencode_db_path
        self._real_omni = a.omniroute_storage_path
        a.opencode_db_path = lambda: '/nonexistent/opencode.db'
        a.omniroute_storage_path = lambda: '/nonexistent/storage.sqlite'

    def tearDown(self):
        a.opencode_db_path = self._real_active
        a.omniroute_storage_path = self._real_omni

    def test_active_reports_missing_source_and_no_agents(self):
        payload = a.read_active_agents()
        self.assertTrue(payload['ok'])
        self.assertEqual(payload['count'], 0)
        self.assertEqual(payload['agents'], [])
        self.assertFalse(payload['sources']['opencode_db']['ok'])
        self.assertEqual(payload['sources']['opencode_db']['error'], 'not installed')

    def test_logs_report_missing_source_and_no_calls(self):
        payload = a.read_agent_logs()
        self.assertTrue(payload['ok'])
        self.assertEqual(payload['calls'], [])
        self.assertFalse(payload['sources']['omniroute_db']['ok'])

    def test_payload_is_json_serialisable(self):
        # A non-serialisable payload would break JSON.parse in the browser and
        # render the whole dashboard as a raw-text error blob.
        json.dumps(a.read_active_agents())
        json.dumps(a.read_agent_logs())


class TestLiveness(unittest.TestCase):
    """Live-vs-idle is decided by recency AND a non-terminal tail."""

    def test_old_session_is_idle(self):
        conn = None
        old = a._ms_now() - (a.ACTIVE_WINDOW_MS * 2)
        live, age = a._session_live(conn, 'nope', old)
        self.assertFalse(live)
        self.assertGreater(age, a.ACTIVE_WINDOW_MS)

    def test_missing_timestamp_is_idle(self):
        self.assertEqual(a._session_live(None, 'nope', None), (False, 0))

    def test_recent_session_is_live(self):
        live, age = a._session_live(None, 'nope', a._ms_now())
        self.assertTrue(live)
        self.assertLess(age, a.ACTIVE_WINDOW_MS)

    def test_future_timestamp_does_not_crash(self):
        live, age = a._session_live(None, 'nope', a._ms_now() + 10_000_000)
        self.assertIsInstance(live, bool)
        self.assertGreaterEqual(age, 0)


class TestCallLogLimits(unittest.TestCase):
    def test_limit_is_clamped(self):
        # A caller cannot ask for an unbounded read of a 488MB store.
        import sqlite3
        conn = sqlite3.connect(':memory:')
        conn.execute(
            'CREATE TABLE call_logs (id TEXT, timestamp TEXT, model TEXT, '
            'requested_model TEXT, provider TEXT, status INTEGER, duration INTEGER, '
            'tokens_in INTEGER, tokens_out INTEGER, tokens_reasoning INTEGER, '
            'error_summary TEXT, session_tag TEXT)'
        )
        rows = a._read_calls(conn, None, 10_000)
        self.assertEqual(rows, [])
        conn.close()


class TestSessionModelPrecedence(unittest.TestCase):
    """#18: 'A or B if C else D' parses as '(A or B) if C else D'.

    When session.model was a JSON string (the normal case: SQLite stores the
    column as text), isinstance(model, dict) was False, so the whole model_id
    expression took the else branch and the newest assistant message's
    modelID was ignored — the console showed the stale session default.
    """

    def _seed(self, session_model, message_model):
        conn = sqlite3.connect(':memory:')
        conn.execute(
            'CREATE TABLE session (id TEXT, title TEXT, agent TEXT, model TEXT, '
            'directory TEXT, cost REAL, tokens_input INT, tokens_output INT, '
            'tokens_reasoning INT, time_created INT, time_updated INT)')
        conn.execute(
            'CREATE TABLE message (id TEXT, session_id TEXT, data TEXT, '
            'time_created INT)')
        conn.execute('INSERT INTO session VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                     ('s1', 'title', 'build', session_model, '/x', 0.0,
                      0, 0, 0, 1, a._ms_now()))
        if message_model is not None:
            payload = dict(message_model)
            payload.setdefault('role', 'assistant')
            conn.execute('INSERT INTO message VALUES (?,?,?,?)',
                         ('m1', 's1', json.dumps(payload), a._ms_now()))
        return conn

    def test_message_model_wins_over_json_string_session_model(self):
        conn = self._seed(
            '{"id":"stale-session-model","providerID":"opencode"}',
            {'modelID': 'fresh-message-model', 'providerID': 'opencode'})
        rows = a._read_sessions(conn, include_idle=True)
        self.assertEqual(rows[0]['model_id'], 'fresh-message-model')
        self.assertEqual(rows[0]['model_provider'], 'opencode')

    def test_json_string_session_model_is_the_fallback(self):
        conn = self._seed(
            '{"id":"json-session-model","providerID":"opencode"}', None)
        rows = a._read_sessions(conn, include_idle=True)
        self.assertEqual(rows[0]['model_id'], 'json-session-model')

    def test_message_model_beats_a_second_json_session_model(self):
        # The exact regression: message wins even when the session model
        # would otherwise resolve fine on its own.
        conn = self._seed(
            '{"id":"session-default","providerID":"opencode"}',
            {'modelID': 'switched-mid-session', 'providerID': 'opencode',
             'variant': 'max'})
        rows = a._read_sessions(conn, include_idle=True)
        self.assertEqual(rows[0]['model_id'], 'switched-mid-session')
        self.assertEqual(rows[0]['model_variant'], 'max')


class TestOmniRouteLogsSqlFiltering(unittest.TestCase):
    """Test SQL-level filtering in omniroute_logs.py."""

    def setUp(self):
        self.conn = sqlite3.connect(':memory:')
        self.conn.execute(
            'CREATE TABLE call_logs ('
            'id TEXT, timestamp TEXT, model TEXT, requested_model TEXT, provider TEXT, duration INTEGER, '
            'tokens_in INTEGER, tokens_out INTEGER, tokens_reasoning INTEGER, request_summary TEXT, status INTEGER, '
            'account TEXT, api_key_id TEXT, api_key_name TEXT, correlation_id TEXT, combo_name TEXT, '
            'cache_source TEXT, source_format TEXT, target_format TEXT, session_tag TEXT, '
            'ttft_ms INTEGER, added_wait_ms INTEGER, added_wait_cause TEXT, model_pinned INTEGER, '
            'resilience_actions TEXT, tokens_cache_read INTEGER, reasoning_effort_requested TEXT, '
            'error_type TEXT, error_summary TEXT, detail_state TEXT, method TEXT, path TEXT)'
        )
        rows = [
            ('c1', '2026-10-18T10:00:00Z', 'claude-3-5-sonnet', 'claude-3-5-sonnet', 'anthropic', 100, 10, 20, 0, 'sum1', 200, 'acc1', '', '', '', '', '', '', '', '', 10, 0, '', 0, '', 0, '', '', '', '', 'POST', '/v1/messages'),
            ('c2', '2026-10-18T10:01:00Z', 'gpt-4o', 'gpt-4o', 'openai', 200, 15, 25, 0, 'sum2', 200, 'acc2', '', '', '', 'auto-router-combo', '', '', '', '', 20, 0, '', 0, '', 0, '', '', '', '', 'POST', '/v1/chat/completions'),
            ('c3', '2026-10-18T10:02:00Z', 'claude-3-5-sonnet', 'claude-3-5-sonnet', 'anthropic', 150, 12, 22, 0, 'sum3', 500, 'acc1', '', '', '', '', '', '', '', '', 15, 0, '', 0, '', 0, '', 'server_error', 'err', '', 'POST', '/v1/messages'),
            ('c4', '2026-10-18T10:03:00Z', 'gemini-1.5-pro', 'gemini-1.5-pro', 'google', 300, 30, 40, 0, 'sum4', 200, 'acc3', '', '', '', '', '', '', '', '', 30, 0, '', 0, '', 0, '', '', '', '', 'POST', '/v1/chat/completions'),
        ]
        self.conn.executemany(
            'INSERT INTO call_logs VALUES (' + ','.join(['?'] * 32) + ')', rows
        )

    def tearDown(self):
        self.conn.close()

    def test_sql_filter_provider_and_pagination(self):
        import omniroute_logs
        rows, total = omniroute_logs._query_calls(
            self.conn, limit=1, offset=0, filters={'provider': 'anthropic'}
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(total, 2)
        self.assertEqual(rows[0]['provider'], 'anthropic')

        # Offset 1 returns second anthropic row
        rows_p2, total_p2 = omniroute_logs._query_calls(
            self.conn, limit=1, offset=1, filters={'provider': 'anthropic'}
        )
        self.assertEqual(len(rows_p2), 1)
        self.assertEqual(total_p2, 2)

    def test_sql_filter_status_error(self):
        import omniroute_logs
        rows, total = omniroute_logs._query_calls(
            self.conn, limit=10, offset=0, filters={'status': 'error'}
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(total, 1)
        self.assertEqual(rows[0]['id'], 'c3')

    def test_sql_filter_agent_claude_protocol(self):
        import omniroute_logs
        rows, total = omniroute_logs._query_calls(
            self.conn, limit=10, offset=0, filters={'agent': 'claude-protocol'}
        )
        self.assertEqual(len(rows), 2)
        self.assertEqual(total, 2)
        self.assertTrue(all(r['path'] == '/v1/messages' for r in rows))


if __name__ == '__main__':
    unittest.main(verbosity=2)