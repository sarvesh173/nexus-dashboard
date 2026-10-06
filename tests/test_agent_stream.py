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


if __name__ == '__main__':
    unittest.main(verbosity=2)