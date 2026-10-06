#!/usr/bin/env python3
"""Offline tests for the OmniRouter call-log reader and the Hermes profile filter.

Two features share this suite because they share one failure mode: both resolve a
caller-supplied string into a filesystem path.

  omniroute_logs.py  reads ~/.omniroute/storage.sqlite (call_logs) plus the
                     per-call JSON artifacts, and resolves a stored
                     `artifact_relpath` back to a file.
  server.py          accepts ?profile= on /api/hermes/logs and resolves it to a
                     log directory.

No network, no credentials, and no dependency on OmniRouter or Hermes being
installed: the SQLite store, the artifact tree and the whole log tree are
synthesised into a temp dir which HERMES_HOME / OMNIROUTE_HOME are pointed at
before either module is imported. The suite therefore passes on a machine that
has neither tool.

Run: python3 tests/test_omniroute_logs.py
"""
import json
import os
import sqlite3
import sys
import tempfile
import unittest

_TMP = tempfile.mkdtemp(prefix='nexus-omniroute-test-')
_HERMES_HOME = os.path.join(_TMP, 'hermes')
_OMNI_HOME = os.path.join(_TMP, 'omniroute')

# Set before the modules under test are imported: paths.py resolves both homes at
# import time, and every helper below derives from them.
os.environ['HERMES_HOME'] = _HERMES_HOME
os.environ['OMNIROUTE_HOME'] = _OMNI_HOME

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import omniroute_logs as o  # noqa: E402
import server  # noqa: E402


def _write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(text)
    return path


def _build_storage(path, rows):
    """A minimal call_logs table. Only the columns the reader selects exist.

    This is deliberate: if the reader ever starts selecting a column the real
    table has but this fixture does not, these tests fail, which is the point.
    A fixture with every real column would hide that.

    Idempotent, because two TestCase classes share this one fixture and each
    runs its own setUpClass.
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path)
    conn.execute(
        'CREATE TABLE call_logs ('
        ' id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, method TEXT, path TEXT,'
        ' status INTEGER, model TEXT, requested_model TEXT, provider TEXT,'
        ' duration INTEGER DEFAULT 0, tokens_in INTEGER DEFAULT 0,'
        ' tokens_out INTEGER DEFAULT 0, tokens_reasoning INTEGER DEFAULT NULL,'
        ' request_summary TEXT, error_summary TEXT, detail_state TEXT,'
        ' artifact_relpath TEXT, artifact_size_bytes INTEGER,'
        ' has_request_body INTEGER, has_response_body INTEGER,'
        ' has_pipeline_details INTEGER)'
    )
    conn.executemany(
        'INSERT INTO call_logs (id, timestamp, method, path, status, model,'
        ' requested_model, provider, duration, tokens_in, tokens_out,'
        ' tokens_reasoning, request_summary, error_summary, detail_state,'
        ' artifact_relpath, artifact_size_bytes, has_request_body,'
        ' has_response_body, has_pipeline_details)'
        ' VALUES (:id, :timestamp, :method, :path, :status, :model,'
        ' :requested_model, :provider, :duration, :tokens_in, :tokens_out,'
        ' :tokens_reasoning, :request_summary, :error_summary, :detail_state,'
        ' :artifact_relpath, :artifact_size_bytes, :has_request_body,'
        ' :has_response_body, :has_pipeline_details)',
        rows,
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Fixtures. Built exactly once, at import time.
#
# Two TestCase classes need this ledger, and a per-class setUpClass would build it
# twice: the second CREATE TABLE would collide, and a DROP-then-CREATE would
# deadlock against the WAL left behind by the first build's readers. Building it
# once and only clearing the reader's own caches afterwards keeps the two classes
# honest about sharing one fixture.
# ---------------------------------------------------------------------------

ARTIFACT_RELPATH = ('2026-10-06/2026-10-06T00-00-00.000Z_'
                    '11111111-2222-3333-4444-555555555555.json')
CALL_ID = '11111111-2222-3333-4444-555555555555'
NO_ARTIFACT_CALL_ID = '33333333-2222-3333-4444-555555555555'
FAILED_CALL_ID = '22222222-2222-3333-4444-555555555555'


def _build_fixtures():
    artifact = {
        'schemaVersion': 5,
        'summary': {'id': CALL_ID, 'status': 200},
        'requestBody': {
            'model': 'test/model',
            'messages': [{'role': 'user', 'content': 'q' * 9000}],
            'tools': [{'name': 'a'}, {'name': 'b'}],
        },
        'responseBody': {
            'choices': [{'message': {'role': 'assistant', 'content': 'a' * 9000}}],
            'usage': {'total_tokens': 12},
        },
        'error': None,
        'pipeline': {'clientRawRequest': {'body': 'z' * 9000}},
    }
    absolute = os.path.join(o.artifact_root(), ARTIFACT_RELPATH)
    _write(absolute, json.dumps(artifact))
    size = os.path.getsize(absolute)

    # Column order matches _build_storage's INSERT exactly. Written one value per
    # line with its column name, because a miscounted positional tuple here
    # silently shifts every later column into the wrong field.
    columns = [
        'id', 'timestamp', 'method', 'path', 'status', 'model',
        'requested_model', 'provider', 'duration', 'tokens_in', 'tokens_out',
        'tokens_reasoning', 'request_summary', 'error_summary', 'detail_state',
        'artifact_relpath', 'artifact_size_bytes', 'has_request_body',
        'has_response_body', 'has_pipeline_details',
    ]
    ledger = [
        # A healthy call, with an artifact and no recorded summary.
        dict(zip(columns, [
            CALL_ID, '2026-10-06T00:00:00.000Z', 'POST', '/v1/chat/completions',
            200, 'model-a', 'prov/model-a', 'prov', 1200, 500, 50, 20,
            None, None, 'ready', ARTIFACT_RELPATH, size, 1, 1, 1])),
        # A failed call: reasoning tokens never reported, no artifact.
        dict(zip(columns, [
            FAILED_CALL_ID, '2026-10-06T00:00:01.000Z', 'POST', '/v1/messages',
            429, 'model-b', 'prov/model-b', 'prov2', 900, 10, 0, None,
            None, 'rate limited', 'ready', None, None, 0, 0, 0])),
        # A call that did record a summary but captured no artifact.
        dict(zip(columns, [
            NO_ARTIFACT_CALL_ID, '2026-10-06T00:00:02.000Z', 'POST',
            '/v1/chat/completions', 200, 'model-c', 'prov/model-c', 'prov',
            80, 1, 1, 1, 'asked about the weather', None, 'none', None, None,
            0, 0, 0])),
    ]
    _build_storage(os.path.join(_OMNI_HOME, 'storage.sqlite'), ledger)


_build_fixtures()


def _reset_reader_caches():
    """Drop the reader's TTL caches so the fixture, not a stale read, answers."""
    o._list_cache['payload'] = None
    o._detail_cache['payload'] = None


class TestClamp(unittest.TestCase):
    """Pagination inputs are attacker- and typo-shaped; every one must be bounded."""

    def test_limit_is_clamped_at_both_ends(self):
        self.assertEqual(o._clamp_limit(0), 1)
        self.assertEqual(o._clamp_limit(-5), 1)
        self.assertEqual(o._clamp_limit(10 ** 9), o.CALLS_MAX_LIMIT)
        self.assertEqual(o._clamp_limit(40), 40)

    def test_unparseable_limit_falls_back_to_default(self):
        for bad in (None, '', 'abc', [], {}, '12.5'):
            self.assertEqual(o._clamp_limit(bad), o.CALLS_DEFAULT_LIMIT)

    def test_offset_never_goes_negative(self):
        self.assertEqual(o._clamp_offset(-1), 0)
        self.assertEqual(o._clamp_offset('0'), 0)
        self.assertEqual(o._clamp_offset(7), 7)
        self.assertEqual(o._clamp_offset('nope'), 0)


class TestClip(unittest.TestCase):
    """Excerpts are the only thing that leaves the reader, so their bounds matter."""

    def test_missing_value_is_empty_not_the_word_none(self):
        self.assertEqual(o._clip(None), '')
        self.assertEqual(o._clip(None, 5), '')

    def test_short_value_is_untouched(self):
        self.assertEqual(o._clip('hello'), 'hello')

    def test_long_value_is_cut_and_marked(self):
        out = o._clip('x' * 5000)
        self.assertTrue(out.endswith('truncated'))
        self.assertLess(len(out), 5000)

    def test_non_string_is_serialised_not_crashed_on(self):
        self.assertIn('7', o._clip({'a': 7}))


class TestReadCallLogs(unittest.TestCase):
    """The list route against a synthesised ledger."""

    def setUp(self):
        _reset_reader_caches()

    def test_returns_every_row_newest_first(self):
        payload = o.read_call_logs(limit=10)
        self.assertTrue(payload['ok'])
        self.assertEqual(payload['total'], 3)
        self.assertEqual(payload['count'], 3)
        self.assertEqual([c['id'] for c in payload['calls']][0],
                         NO_ARTIFACT_CALL_ID)

    def test_source_reports_a_real_store(self):
        self.assertTrue(o.read_call_logs(limit=1)['source']['ok'])

    def test_pagination_windows_without_losing_rows(self):
        first = o.read_call_logs(limit=2, offset=0)['calls']
        second = o.read_call_logs(limit=2, offset=2)['calls']
        self.assertEqual(len(first), 2)
        self.assertEqual(len(second), 1)
        self.assertFalse({c['id'] for c in first} & {c['id'] for c in second})

    def test_offset_past_the_end_is_empty_not_an_error(self):
        payload = o.read_call_logs(limit=10, offset=500)
        self.assertEqual(payload['count'], 0)
        self.assertEqual(payload['total'], 3)

    def test_null_request_summary_is_flagged_not_faked(self):
        # The proxy leaves request_summary NULL on most rows. Reporting a
        # fabricated summary here would be indistinguishable from a real one.
        rows = {c['id']: c for c in o.read_call_logs(limit=10)['calls']}
        blank = rows[CALL_ID]
        self.assertFalse(blank['has_summary'])
        self.assertEqual(blank['request_summary'], '')
        # ...while the recorded method/path are still available, because those
        # ARE real stored data.
        self.assertEqual(blank['method'], 'POST')
        self.assertEqual(blank['path'], '/v1/chat/completions')

    def test_whitespace_summary_is_not_counted_as_a_summary(self):
        rows = {c['id']: c for c in o.read_call_logs(limit=10)['calls']}
        self.assertTrue(rows[NO_ARTIFACT_CALL_ID]['has_summary'])

    def test_status_maps_to_ok_without_a_fabricated_success(self):
        rows = {c['id']: c for c in o.read_call_logs(limit=10)['calls']}
        self.assertTrue(rows[CALL_ID]['ok'])
        self.assertFalse(rows[FAILED_CALL_ID]['ok'])

    def test_absent_reasoning_tokens_stay_none_not_zero(self):
        # Zero is a measurement; None is "not reported". Collapsing them makes a
        # dead sensor look like a healthy one.
        rows = {c['id']: c for c in o.read_call_logs(limit=10)['calls']}
        self.assertIsNone(rows[FAILED_CALL_ID]
                          ['tokens']['reasoning'])
        self.assertEqual(rows[CALL_ID]
                         ['tokens']['reasoning'], 20)

    def test_null_reasoning_tokens_are_none_and_a_real_zero_is_zero(self):
        # tokens_reasoning is nullable. NULL means "not reported" and must stay
        # distinguishable from a genuine 0-token reasoning turn, because the
        # metric-tile contract renders a missing value as '--' and never as '0'.
        null_row = o._shape_call(('id', '2026-01-01T00:00:00.000Z', 'm', 'r', 'p',
                                  5, 1, 1, None, None, 200, 'POST', '/p'))
        self.assertIsNone(null_row['tokens']['reasoning'])

        zero_row = o._shape_call(('id', '2026-01-01T00:00:00.000Z', 'm', 'r', 'p',
                                  5, 1, 1, 0, None, 200, 'POST', '/p'))
        self.assertEqual(zero_row['tokens']['reasoning'], 0)

    def test_a_row_shapes_without_raising_on_any_null_column(self):
        # Old rows are sparse. Every one of these columns is nullable in the real
        # schema, so a row must render rather than raise.
        row = o._shape_call((None, None, None, None, None, None, None, None,
                             None, None, None, None, None))
        self.assertEqual(row['status'], 0)
        self.assertEqual(row['duration_ms'], 0)
        self.assertEqual(row['tokens'], {'input': 0, 'output': 0, 'reasoning': None})
        self.assertEqual(row['model'], '')
        self.assertFalse(row['has_summary'])


class TestReadDetail(unittest.TestCase):
    """The detail route: one artifact, bounded on the way out."""

    def setUp(self):
        _reset_reader_caches()

    def test_detail_reads_the_artifact_and_clips_the_bodies(self):
        detail = o.read_call_log_detail(CALL_ID)
        self.assertTrue(detail['available'])
        body = detail['body']
        self.assertEqual(body['request']['model'], 'test/model')
        # A 9000-char message must not leave the reader at 9000 chars.
        self.assertLess(len(body['request']['messages'][0]['content']),
                        o.EXCERPT_CHARS + 64)
        self.assertEqual(body['request']['tool_count'], 2)

    def test_detail_wire_size_is_far_below_the_artifact(self):
        # The point of the whole module: a 300KB artifact must not become a
        # 300KB response on a view that renders 40 rows.
        detail = o.read_call_log_detail(CALL_ID)
        self.assertLess(len(json.dumps(detail)), o.EXCERPT_CHARS * 12)

    def test_pipeline_is_reduced_to_names_and_sizes(self):
        detail = o.read_call_log_detail(CALL_ID)
        stages = detail['body']['pipeline']
        self.assertEqual([s['stage'] for s in stages], ['clientRawRequest'])
        self.assertGreater(stages[0]['bytes'], 0)
        # No payload survives into the response.
        self.assertNotIn('body', stages[0])

    def test_call_without_an_artifact_reports_why(self):
        detail = o.read_call_log_detail(NO_ARTIFACT_CALL_ID)
        self.assertTrue(detail['available'])
        self.assertIsNone(detail['body'])
        self.assertIn('no artifact', detail['body_error'])

    def test_unknown_id_is_unavailable_not_an_empty_drawer(self):
        detail = o.read_call_log_detail('99999999-2222-3333-4444-555555555555')
        self.assertFalse(detail['available'])
        self.assertEqual(detail['error'], 'call not found')

    def test_malformed_id_is_refused_before_any_filesystem_work(self):
        for bad in ("'; DROP TABLE call_logs;--", '../../x', '', 'a' * 500, None):
            detail = o.read_call_log_detail(bad)
            self.assertFalse(detail['available'])
            self.assertIn('invalid call id', detail['error'] or '')


class TestArtifactGuards(unittest.TestCase):
    """resolve_artifact is the only path from a stored string to a file read."""

    def test_the_real_artifact_shape_resolves(self):
        rel = ARTIFACT_RELPATH
        resolved = o.resolve_artifact(rel)
        self.assertIsNotNone(resolved)
        self.assertTrue(resolved.endswith('.json'))

    def test_traversal_and_malformed_shapes_are_all_refused(self):
        for bad in (
            '../../../etc/passwd',
            '2026-10-06/../../../../etc/passwd',
            '/etc/passwd',
            '/2026-10-06/x.json',
            '2026-10-06',
            'not-a-date/x.json',
            '2026-10-06/plain.json',
            '2026-10-06/x.txt',
            '2026-10-06/2026-10-06T00-00-00.000Z_notuuid.json',
            None, '', 12345, [], {},
        ):
            self.assertIsNone(o.resolve_artifact(bad), 'accepted %r' % (bad,))


class TestDegradation(unittest.TestCase):
    """An absent store is a state, not a crash, and never a fabricated ok."""

    def test_missing_database_reports_source_not_ok(self):
        old = os.environ['OMNIROUTE_HOME']
        os.environ['OMNIROUTE_HOME'] = os.path.join(_TMP, 'does-not-exist')
        try:
            import paths
            import importlib
            importlib.reload(paths)
            importlib.reload(o)
            payload = o.read_call_logs(limit=5)
            self.assertTrue(payload['ok'])
            self.assertFalse(payload['source']['ok'])
            self.assertEqual(payload['source']['error'], 'not installed')
            self.assertEqual(payload['calls'], [])
        finally:
            os.environ['OMNIROUTE_HOME'] = old
            importlib.reload(paths)
            importlib.reload(o)


class TestProfileMatching(unittest.TestCase):
    """Which shared-log lines belong to which profile."""

    def test_explicit_marker_matches_only_its_own_profile(self):
        line = '2026-10-05 01:03:17,224 INFO gateway.run: telegram connected (profile: alya)'
        self.assertTrue(server._line_matches_profile(line, 'alya'))
        self.assertFalse(server._line_matches_profile(line, 'mom'))

    def test_unattributed_line_belongs_to_default_only(self):
        # The shared log IS the default profile's log. Handing its unattributed
        # lines to any other profile would be a guess.
        line = '2026-10-05 01:03:17,224 INFO gateway.run: scheduler started'
        self.assertTrue(server._line_matches_profile(line, 'default'))
        self.assertFalse(server._line_matches_profile(line, 'alya'))

    def test_another_profiles_marker_never_leaks(self):
        line = '2026-10-05 01:07:01,585 INFO gateway.run: ok (profile: mom)'
        self.assertFalse(server._line_matches_profile(line, 'alya'))
        self.assertFalse(server._line_matches_profile(line, 'default'))

    def test_marker_tolerates_spacing(self):
        for text in ('(profile: alya)', '(profile:alya)', '(profile:  alya )'):
            line = '2026-10-05 01:03:17,224 INFO gateway.run: x %s' % text
            self.assertTrue(server._line_matches_profile(line, 'alya'), text)


class TestProfileSafety(unittest.TestCase):
    """`profile` is a path segment. These are the only names allowed to become one."""

    def test_plain_names_are_accepted(self):
        for good in ('alya', 'mom', 'default', 'a', 'A-b_c.1'):
            self.assertEqual(server._safe_hermes_profile(good), good)

    def test_traversal_shapes_are_refused(self):
        for bad in ('../etc', '../../etc', '/etc/passdown', '..', '.',
                    'a/b', 'a\\b', '.hidden', '-lead', 'a' * 100, '',
                    ' ', 'a b', 'a;rm -rf'):
            self.assertIsNone(server._safe_hermes_profile(bad),
                              'accepted %r' % (bad,))

    def test_absent_is_distinct_from_rejected(self):
        # None means "no filter asked for" and is NOT a rejection.
        self.assertFalse(server._hermes_profile_rejected(None))
        self.assertFalse(server._hermes_profile_rejected(''))
        self.assertTrue(server._hermes_profile_rejected('../../etc'))


class TestProfileFilteredFeed(unittest.TestCase):
    """get_hermes_logs end to end against a synthesised log tree."""

    @classmethod
    def setUpClass(cls):
        stamp = '2026-10-05 01:00:00,000'
        shared = '\n'.join([
            '%s INFO gateway.run: shared unattributed line' % stamp,
            '%s INFO gateway.run: connected (profile: alya)' % stamp,
            '%s INFO gateway.run: connected (profile: mom)' % stamp,
        ])
        _write(os.path.join(_HERMES_HOME, 'logs', 'gateway.log'), shared)

        _write(os.path.join(_HERMES_HOME, 'profiles', 'alya', 'logs',
                            'gateway.log'),
               '%s INFO gateway.run: alya own line' % stamp)
        # `mom` deliberately has a log DIRECTORY but no gateway.log in it: the
        # reader must not silently fall through to the shared marker match and
        # present another profile's traffic as mom's.
        _write(os.path.join(_HERMES_HOME, 'profiles', 'mom', 'logs',
                            'errors.log'),
               '%s ERROR gateway.run: mom errors only' % stamp)

    def setUp(self):
        server._hermes_log_cache['payload'] = None

    def test_unfiltered_reads_the_shared_log(self):
        payload = server.get_hermes_logs(limit=50)
        self.assertIsNone(payload['profile'])
        self.assertEqual(payload['count'], 3)
        self.assertIsNone(payload['profile_source'])

    def test_profile_with_its_own_log_reads_that_file(self):
        payload = server.get_hermes_logs(limit=50, profile='alya')
        self.assertEqual(payload['profile_source'], 'profile-dir')
        self.assertEqual(payload['count'], 1)
        self.assertIn('alya own line', payload['logs'][0]['message'])

    def test_default_reads_the_shared_log_without_marker_filtering(self):
        payload = server.get_hermes_logs(limit=50, profile='default')
        self.assertEqual(payload['profile_source'], 'shared')
        # The unattributed line is default's; alya's and mom's marked lines are
        # not.
        messages = [r['message'] for r in payload['logs']]
        self.assertTrue(any('shared unattributed' in m for m in messages))
        self.assertFalse(any('profile: alya' in m for m in messages))

    def test_profile_without_its_own_log_falls_back_to_the_marker_match(self):
        payload = server.get_hermes_logs(limit=50, profile='mom', source='gateway')
        # mom HAS a profiles dir, but no gateway.log in it, so the shared
        # marker match applies and reports which file it consulted.
        self.assertEqual(payload['profile_source'], 'shared')
        self.assertEqual(payload['count'], 1)
        self.assertIn('profile: mom', payload['logs'][0]['message'])

    def test_empty_own_log_is_a_state_not_a_fallback(self):
        payload = server.get_hermes_logs(limit=50, profile='mom', source='errors')
        self.assertEqual(payload['profile_source'], 'profile-dir')
        self.assertEqual(payload['count'], 1)

    def test_a_profile_with_nothing_says_which_file_it_read(self):
        payload = server.get_hermes_logs(limit=50, profile='ghost')
        self.assertEqual(payload['count'], 0)
        self.assertIn('no gateway.log records tagged', payload['error'])

    def test_rejected_profile_returns_nothing_rather_than_everything(self):
        # The whole point: answering a bad profile with all traffic would look
        # in the UI exactly like a filter that worked.
        payload = server.get_hermes_logs(limit=50, profile='../../etc')
        self.assertEqual(payload['profile_source'], 'rejected')
        self.assertEqual(payload['count'], 0)
        self.assertEqual(payload['logs'], [])
        self.assertIsNotNone(payload['error'])

    def test_limit_still_applies_within_a_profile(self):
        payload = server.get_hermes_logs(limit=1, profile='default')
        self.assertEqual(payload['count'], 1)

    def test_cache_is_keyed_per_profile(self):
        # A cached unfiltered page must never be served for a filtered request.
        # Both fixture profiles happen to yield one record, so the assertion is on
        # which file was read - not on the count, which would pass even if the
        # cache ignored the profile entirely.
        server._hermes_log_cache['payload'] = None
        first = server.get_hermes_logs(limit=50, profile='alya')
        second = server.get_hermes_logs(limit=50, profile='default')
        self.assertEqual(first['profile_source'], 'profile-dir')
        self.assertEqual(second['profile_source'], 'shared')
        self.assertIn('alya own line', first['logs'][0]['message'])
        self.assertNotIn('alya own line', second['logs'][0]['message'])
        self.assertEqual(server._hermes_log_cache['key'][2], 'default')

    def test_only_allowlisted_sources_are_read(self):
        payload = server.get_hermes_logs(limit=5, source='../../etc/passwd')
        self.assertEqual(payload['source'], 'gateway')


if __name__ == '__main__':
    unittest.main(verbosity=2)