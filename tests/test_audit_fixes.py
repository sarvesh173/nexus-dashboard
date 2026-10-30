"""Regression tests for the failures found in the 2026-10-04 backend audit.

Every check here corresponds to a bug that was reproduced before the fix. The
tests are pure/offline: HTTP is stubbed, nothing touches the network or the
real cache file.

The shared theme is error MASKING. Several bugs did not crash; they quietly
reported success while holding wrong or frozen data. That is far more dangerous
than an exception, so these tests assert on what gets REPORTED, not just on
whether a call returned.
"""
import io
import json
import os
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import live_sync  # noqa: E402
from models_payload import model_rows  # noqa: E402


def _stub_urlopen(payload):
    """Return a urlopen stand-in that yields `payload` as JSON bytes."""
    import urllib.request

    def _open(req, timeout=None):
        body = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
        return io.BytesIO(body)

    return _open


class TestFetchOmniRouteNeverRaises(unittest.TestCase):
    """BUG: a non-dict /models payload raised AttributeError out of the fetch.

    The old line was `data.get("data", data if isinstance(data, list) else [])`.
    `.get` was evaluated first, so a top-level JSON array raised before the
    isinstance fallback could help. That escaped fetch_omniroute AND sync_once,
    discarding the gateway and Hermes results as well.
    """

    def _run(self, payload):
        """Call fetch_omniroute against a stubbed HTTP layer and a stubbed key.

        Both have to be stubbed. fetch_omniroute returns early with
        "no API key found" when omniroute_endpoint() finds nothing, so on a
        machine or runner without that key every assertion below would compare
        against an empty dict and fail. The suite has to depend on neither the
        developer's credentials nor the network.
        """
        import urllib.request
        orig_urlopen = urllib.request.urlopen
        orig_endpoint = live_sync.omniroute_endpoint
        urllib.request.urlopen = _stub_urlopen(payload)
        live_sync.omniroute_endpoint = lambda: {
            "base_url": "http://stub.invalid/v1", "api_key": "stub"}
        try:
            return live_sync.fetch_omniroute()
        finally:
            urllib.request.urlopen = orig_urlopen
            live_sync.omniroute_endpoint = orig_endpoint

    def test_top_level_list_does_not_raise(self):
        buckets, err = self._run([])
        self.assertIsInstance(buckets, dict)
        self.assertIsNone(err)

    def test_data_field_of_wrong_type_does_not_raise(self):
        for payload in ({"data": "str"}, {"data": {"k": 1}}, {"data": None}, "hi", 5, None):
            with self.subTest(payload=payload):
                buckets, err = self._run(payload)
                self.assertIsInstance(buckets, dict)

    def test_non_dict_entries_are_skipped(self):
        buckets, err = self._run({"data": [{"id": "a/b"}, "rawstring", 42, None]})
        self.assertEqual(list(buckets), ["a"])          # only the real one
        self.assertEqual([m["id"] for m in buckets["a"]["models"]], ["a/b"])

    def test_non_string_id_is_skipped_not_crashed(self):
        """An int id used to explode on .split() inside omniroute_vendor."""
        buckets, err = self._run({"data": [{"id": 123}, {"id": "ok/gpt-4"}]})
        self.assertEqual(list(buckets), ["ok"])

    def test_empty_string_id_is_skipped(self):
        buckets, err = self._run({"data": [{"id": ""}, {"id": "   "}, {"id": "v/m"}]})
        self.assertEqual(list(buckets), ["v"])

    def test_well_formed_payload_still_works(self):
        buckets, err = self._run({"data": [{"id": "openrouter/anthropic/claude"}]})
        self.assertIn("openrouter", buckets)
        self.assertIsNone(err)


class TestAutoNamespaceIsNotAVendor(unittest.TestCase):
    """BUG: `auto/` routing aliases became 11 phantom providers.

    `auto/` is OmniRoute's routing namespace. Stripping it and reading the next
    token as a vendor invented "claudeopus" from "auto/claude-opus", and added
    junk single-model rows to real vendors (gemini, deepseek, zhipu).
    """

    def test_auto_prefixed_ids_never_yield_a_vendor(self):
        for mid in ("auto/claude-opus", "auto/gpt", "auto/gemini", "auto/deepseek",
                    "auto/qwen", "auto/kimi", "auto/glm", "auto/zai",
                    "auto/coding:reliable", "auto/minimax", "auto/llama"):
            with self.subTest(mid=mid):
                self.assertIsNone(live_sync.omniroute_vendor(mid))

    def test_real_prefix_after_a_real_modifier_still_resolves(self):
        """Only `auto/` is the router namespace; kc/ and no-think/ are modifiers
        that legitimately precede a vendor."""
        self.assertEqual(live_sync.omniroute_vendor("kc/openrouter/free"), "openrouter")
        self.assertEqual(
            live_sync.omniroute_vendor("no-think/openrouter/anthropic/claude"),
            "openrouter",
        )

    def test_reliable_is_a_router_keyword(self):
        self.assertIn("reliable", live_sync._ROUTER_KEYWORDS)


class TestSlashlessIdIsNotAProvider(unittest.TestCase):
    """BUG: a model id with no '/' became its own provider row.

    "nemotron-ultra" produced a fake provider duplicating nvidia.
    """

    def test_single_segment_has_no_vendor(self):
        for mid in ("nemotron-ultra", "gpt-4", "", None, "just-a-name"):
            with self.subTest(mid=mid):
                self.assertIsNone(live_sync.omniroute_vendor(mid))

    def test_two_segments_still_resolve(self):
        self.assertEqual(live_sync.omniroute_vendor("openrouter/free"), "openrouter")


class TestReadCacheShape(unittest.TestCase):
    """BUG: valid-but-wrong-shape JSON was returned to callers that call .get()."""

    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.path = os.path.join(self.dir, "c.json")

    def _write(self, text):
        with open(self.path, "w", encoding="utf-8") as fh:
            fh.write(text)

    def test_non_dict_json_becomes_empty_dict(self):
        for text in ('"hi"', "5", "[]", "null", "true", '["a"]'):
            with self.subTest(text=text):
                self._write(text)
                self.assertEqual(live_sync.read_cache(self.path), {})

    def test_object_json_passes_through(self):
        self._write('{"_meta": {"providers": 3}}')
        self.assertEqual(live_sync.read_cache(self.path)["_meta"]["providers"], 3)

    def test_corrupt_and_missing_files_are_empty_dict(self):
        self.assertEqual(live_sync.read_cache(self.path), {})
        self._write("{not json")
        self.assertEqual(live_sync.read_cache(self.path), {})


class TestWriteCachePathHandling(unittest.TestCase):
    """BUG: os.makedirs(os.path.dirname(path)) raised on a bare relative name."""

    def test_bare_relative_filename_does_not_raise(self):
        d = tempfile.mkdtemp()
        cwd = os.getcwd()
        os.chdir(d)
        try:
            data = {"a": {"models": [{"id": "m"}]}}
            out = live_sync.write_cache(data, path="relcache.json")
            self.assertEqual(out["_meta"]["models"], 1)
            self.assertTrue(os.path.exists(os.path.join(d, "relcache.json")))
        finally:
            os.chdir(cwd)

    def test_no_temp_file_is_left_behind(self):
        d = tempfile.mkdtemp()
        path = os.path.join(d, "c.json")
        live_sync.write_cache({"a": {"models": [{"id": "m"}]}}, path=path)
        leftovers = [f for f in os.listdir(d) if ".tmp" in f]
        self.assertEqual(leftovers, [], f"orphan temp files: {leftovers}")


class TestConcurrentSyncsDoNotCorruptTheCache(unittest.TestCase):
    """BUG: the 30s daemon thread and /api/sync-now shared one temp path.

    Reproduced before the fix at roughly 3 failures in 15 trials: invalid JSON,
    or a lost os.replace because one writer had already moved the other's temp
    file. That is silent data corruption, not a visible error.
    """

    def test_parallel_writers_always_leave_valid_json(self):
        d = tempfile.mkdtemp()
        path = os.path.join(d, "c.json")
        errors = []
        barrier = threading.Barrier(8)

        def writer(n):
            barrier.wait()
            try:
                data = {f"p{n}": {"models": [{"id": f"m{n}-{i}"} for i in range(50)]}}
                live_sync.write_cache(data, path=path, status={"writer": n})
            except Exception as exc:                      # noqa: BLE001
                errors.append(f"{type(exc).__name__}: {exc}")

        threads = [threading.Thread(target=writer, args=(i,)) for i in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(errors, [], "a writer raised")
        # The file must be complete and parseable no matter who won.
        with open(path, encoding="utf-8") as fh:
            final = json.load(fh)                     # raises if torn
        self.assertIn("_meta", final)
        self.assertEqual(
            [f for f in os.listdir(d) if ".tmp" in f], [],
            "concurrent writes left orphan temp files",
        )

    def test_sync_lock_serialises_sync_once(self):
        """Two callers must not be inside the critical section at once.

        The probe measures INSIDE the locked body, which is what _sync_once_locked
        stands in for. Marking entry before calling sync_once would instead just
        measure the threads arriving at the same moment.
        """
        import live_sync as ls
        overlap = []
        active = []
        guard = threading.Lock()

        def fake_body(path=None):
            with guard:
                if active:
                    overlap.append(True)
                active.append(1)
            time.sleep(0.005)                 # hold the section open
            with guard:
                active.pop()
            return {}, {"ok": True}

        orig = ls._sync_once_locked
        ls._sync_once_locked = fake_body
        try:
            ts = [threading.Thread(target=lambda: ls.sync_once("unused.json"))
                  for _ in range(6)]
            for t in ts:
                t.start()
            for t in ts:
                t.join()
        finally:
            ls._sync_once_locked = orig

        self.assertEqual(overlap, [], "two threads were inside sync_once at once")


class TestBackgroundLoopSurvivesAndReports(unittest.TestCase):
    """BUG: the loop swallowed exceptions with a bare `except: pass`.

    A frozen cache is indistinguishable from a healthy one from outside, so a
    dead OmniRoute would leave the dashboard stale forever with nothing logged.
    """

    def test_sync_once_is_the_only_entry_point(self):
        import inspect
        src = inspect.getsource(live_sync.start_background)
        self.assertIn("except Exception as exc", src)
        self.assertNotIn("except Exception:\n            pass", src)

    def test_lock_is_released_when_the_body_raises(self):
        """A raise inside must not leave the lock held and wedge every future sync."""
        import live_sync as ls
        orig = ls._sync_once_locked
        ls._sync_once_locked = lambda path=None: (_ for _ in ()).throw(RuntimeError("boom"))
        try:
            with self.assertRaises(RuntimeError):
                ls.sync_once(os.path.join(tempfile.mkdtemp(), "x.json"))
            # The next call must not block forever on a held lock.
            self.assertFalse(ls._sync_lock.locked(), "lock stayed held after a raise")
        finally:
            ls._sync_once_locked = orig


class TestRunSyncFetchSpecsImports(unittest.TestCase):
    """BUG: `run_sync.fetch_specs()` called `hermes_config_path()` which was not imported.

    When an NVIDIA API key was present in configuration, `run_sync.py` crashed
    with `NameError: name 'hermes_config_path' is not defined`.
    Also tests that missing `requests` is handled gracefully without AttributeError.
    """

    def test_fetch_specs_resolves_hermes_config_path_without_name_error(self):
        from unittest.mock import patch, MagicMock
        import run_sync

        fake_requests = MagicMock()
        fake_requests.get.return_value.status_code = 200
        fake_requests.get.return_value.json.return_value = {"data": []}

        with patch("model_health._api_key", return_value="dummy_key"), \
             patch("run_sync.hermes_config_path", return_value="/nonexistent/config.yaml"), \
             patch.dict("sys.modules", {"requests": fake_requests}):
            try:
                run_sync.fetch_specs()
            except FileNotFoundError:
                pass  # hermes_config_path was successfully called and resolved
            except NameError as exc:
                self.fail(f"run_sync.fetch_specs raised NameError: {exc}")

    def test_fetch_specs_handles_none_requests_without_attribute_error(self):
        from unittest.mock import patch
        import run_sync

        with patch("model_health._api_key", return_value="dummy_key"), \
             patch("run_sync.hermes_config_path", return_value="/nonexistent/config.yaml"), \
             patch.dict("sys.modules", {"requests": None}):
            try:
                specs = run_sync.fetch_specs()
                self.assertIsInstance(specs, list)
            except AttributeError as exc:
                self.fail(f"run_sync.fetch_specs raised AttributeError when requests was None: {exc}")


class TestMetaCountsAgreeWithRows(unittest.TestCase):
    """The counts are what every consumer quotes, so they must be self-consistent."""

    def test_unique_never_exceeds_entries_and_duplicates_reconcile(self):
        d = tempfile.mkdtemp()
        path = os.path.join(d, "c.json")
        data = {
            "a": {"models": [{"id": f"m{i}"} for i in range(10)]},
            "b": {"models": [{"id": f"m{i}"} for i in range(5)] + [{"id": f"n{i}"} for i in range(5)]},
        }
        meta = live_sync.write_cache(data, path=path)["_meta"]
        self.assertEqual(meta["providers"], 2)
        self.assertEqual(meta["models"], 20)
        self.assertEqual(meta["unique_models"], 15)
        self.assertEqual(meta["duplicate_rows"], meta["models"] - meta["unique_models"])
        self.assertLessEqual(meta["unique_models"], meta["models"])


class TestServerOptionalImportsGuard(unittest.TestCase):
    """Guard optional psutil and requests imports in server.py against AttributeError when None."""

    def test_get_hermes_status_when_psutil_is_none(self):
        from unittest.mock import patch, mock_open
        import server

        with patch.object(server, 'psutil', None), \
             patch.object(server, '_hermes_state_cache', {'payload': None, 'at': 0}), \
             patch('server.hermes_gateway_state_path', return_value='/tmp/fake_state.json'), \
             patch('builtins.open', mock_open(read_data='{"pid": 12345}')):
            status = server.get_hermes_status()
            self.assertIsInstance(status, dict)
            self.assertFalse(status['alive'])
            self.assertEqual(status['pid'], 12345)

    def test_get_hermes_config_providers_when_requests_is_none(self):
        from unittest.mock import patch, mock_open
        import server

        class FakeYaml:
            @staticmethod
            def safe_load(f):
                return {'providers': {'nvidia': {'api_key': 'test', 'enabled': True}}}

        server._cached_providers = None
        with patch.object(server, 'requests', None), \
             patch.object(server, 'yaml', FakeYaml), \
             patch('server.hermes_config_path', return_value='/tmp/fake.yaml'), \
             patch('builtins.open', mock_open(read_data='dummy')):
            providers = server.get_hermes_config_providers()
            self.assertIsInstance(providers, list)
            self.assertEqual(len(providers), 1)
            self.assertEqual(providers[0]['status'], 'Unavailable')


    def test_get_hermes_config_providers_status_healthy_when_200(self):
        from unittest.mock import patch, MagicMock, mock_open
        import server

        cfg_dict = {"providers": {"nvidia": {"api_key": "dummy"}}}
        mock_req = MagicMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"data": [{"id": "nvidia/model-a"}]}
        mock_req.get.return_value = mock_resp

        fake_yaml = MagicMock()
        fake_yaml.safe_load.return_value = cfg_dict

        with patch("server.requests", mock_req), \
             patch("server.yaml", fake_yaml), \
             patch("server.hermes_config_path", return_value="/nonexistent/config.yaml"), \
             patch("builtins.open", mock_open(read_data="{}")):
            server._cached_providers = None
            res = server.get_hermes_config_providers()
            self.assertIsInstance(res, list)
            self.assertEqual(len(res), 1)
            self.assertEqual(res[0].get("status"), "Healthy")
            model_ids = [m["id"] for m in res[0].get("models", [])]
            self.assertIn("nvidia/model-a", model_ids)


class TestModelRowsNormalisation(unittest.TestCase):
    """#16/#21: /models payloads are normalised by the shared model_rows()
    guard before any caller indexes them.

    Before the guard, server.py:942, model_health.py:63 and run_sync.py all
    called payload.get('data', []) directly. A top-level JSON array made .get
    raise AttributeError (blanking the whole catalog), and a non-dict row or
    non-string id crashed at .lower()/.split('/').
    """

    def test_documented_shape_passes_through(self):
        rows = model_rows({"data": [{"id": "nvidia/model-a"}, {"id": "meta/llama-3"}]})
        self.assertEqual([m for m, _ in rows], ["nvidia/model-a", "meta/llama-3"])

    def test_top_level_list_is_accepted(self):
        # The shape that used to raise: .get never existed on a list.
        rows = model_rows([{"id": "nvidia/model-a"}])
        self.assertEqual([m for m, _ in rows], ["nvidia/model-a"])

    def test_non_dict_rows_are_skipped(self):
        rows = model_rows({"data": ["rawstring", 42, None, {"id": "ok/model"}]})
        self.assertEqual([m for m, _ in rows], ["ok/model"])

    def test_non_string_ids_are_skipped(self):
        rows = model_rows({"data": [{"id": 123}, {"id": None}, {"id": ""}, {"id": "good/x"}]})
        self.assertEqual([m for m, _ in rows], ["good/x"])

    def test_wrong_shapes_yield_empty_not_raise(self):
        for payload in (None, "hi", 5, {"data": "str"}, {"data": {"k": 1}}, {"data": None}):
            self.assertEqual(model_rows(payload), [], payload)


class TestLiveSpecsNon200IsLoud(unittest.TestCase):
    """run_sync._live_specs must not parse an error body, and a non-200 must
    not publish as an empty-but-healthy catalog."""

    def test_non_200_returns_empty(self):
        import run_sync
        resp = MagicMock()
        resp.status_code = 503
        resp.json.return_value = {"error": "unavailable"}
        fake_req = MagicMock()
        fake_req.get.return_value = resp
        with patch.dict("sys.modules", {"requests": fake_req}):
            self.assertEqual(run_sync._live_specs("https://x/v1", "k"), [])

    def test_array_payload_is_parsed_not_crashed(self):
        import run_sync
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = [{"id": "nvidia/model-a"}, "junk", {"id": 7}]
        fake_req = MagicMock()
        fake_req.get.return_value = resp
        with patch.dict("sys.modules", {"requests": fake_req}):
            specs = run_sync._live_specs("https://x/v1", "k")
        self.assertEqual(specs, [("nvidia/model-a", "text")])




class TestOpenRouterTopProviderNull(unittest.TestCase):
    """#19: OpenRouter returns "top_provider": null for many models.

    item.get('top_provider', {}) then returned the stored None, and the
    chained .get('max_completion_tokens') raised inside do_GET's broad try —
    silently killing the whole context lookup so a verified window fell
    through to the stealth heuristic.
    """

    def _lookup(self, payload, model_id):
        import server
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = payload
        mock_req = MagicMock()
        mock_req.get.return_value = resp
        with patch("server.requests", mock_req):
            return server._openrouter_lookup(model_id)

    def test_null_top_provider_still_resolves_context(self):
        ctx, out, source = self._lookup(
            {'data': [{'id': 'vendor/model-x', 'context_length': 128000,
                       'top_provider': None}]},
            'vendor/model-x')
        self.assertEqual(ctx, 128000)
        self.assertIsNone(out)
        self.assertEqual(source, 'openrouter-verified')

    def test_suffix_match_with_null_top_provider(self):
        ctx, out, source = self._lookup(
            {'data': [{'id': 'openai/gpt-4o', 'context_length': 128000,
                       'top_provider': None}]},
            'gpt-4o')
        self.assertEqual(ctx, 128000)
        self.assertEqual(source, 'openrouter-verified')

    def test_populated_top_provider_still_resolves(self):
        ctx, out, source = self._lookup(
            {'data': [{'id': 'vendor/model-x', 'context_length': 128000,
                       'top_provider': {'max_completion_tokens': 16384}}]},
            'vendor/model-x')
        self.assertEqual(ctx, 128000)
        self.assertEqual(out, 16384)
        self.assertEqual(source, 'openrouter-verified')

    def test_missing_model_is_heuristic_not_crash(self):
        ctx, out, source = self._lookup({'data': [{'id': 'other/model'}]},
                                        'vendor/nope')
        self.assertIsNone(ctx)
        self.assertEqual(source, 'heuristic')

    def test_array_catalog_is_parsed_not_crashed(self):
        ctx, out, source = self._lookup(
            [{'id': 'vendor/model-x', 'context_length': 4096,
              'top_provider': None}, 'junk'],
            'vendor/model-x')
        self.assertEqual(ctx, 4096)
        self.assertEqual(source, 'openrouter-verified')


class TestTelemetryCpuSingleSample(unittest.TestCase):
    """#5: the overall CPU figure came from a second back-to-back
    cpu_percent(interval=None) call, which samples a ~0ms window and reads a
    constant 0.0%. It is now the mean of the per-core list from ONE call.
    """

    def test_cpu_percent_is_mean_of_percpu(self):
        import server

        class FakePsutil:
            @staticmethod
            def virtual_memory():
                class M:
                    total = 8 * 1024 ** 3
                    used = 4 * 1024 ** 3
                    available = 4 * 1024 ** 3
                    percent = 50.0
                return M()

            @staticmethod
            def swap_memory():
                class S:
                    total = used = free = 0
                    percent = 0.0
                return S()

            @staticmethod
            def cpu_percent(interval=None, percpu=False):
                # A second scalar call would sample a ~0ms window: the fix
                # must use exactly one percpu call.
                if not percpu:
                    raise AssertionError('scalar cpu_percent call reintroduced')
                return [10.0, 20.0]

            @staticmethod
            def disk_usage(path):
                class D:
                    percent = 55.5
                return D()

        def _no_systemctl(*a, **k):
            raise FileNotFoundError('no systemctl in tests')

        server._cached_data = None
        server._last_poll_time = 0
        with patch("server.psutil", FakePsutil), \
             patch("server.subprocess.check_output", _no_systemctl):
            t = server.get_telemetry()
        self.assertEqual(t['cpu_percent'], 15.0)
        self.assertEqual(t['cpu_cores'], [10.0, 20.0])
        self.assertEqual(t['disk_percent'], 55.5)


class TestSpecialRoutesExistOnHost(unittest.TestCase):
    """tts/stt were mapped to /v1/audio/speech and /v1/audio/transcriptions —
    neither route exists on integrate.api.nvidia.com (verified live: 404 plain
    text regardless of model or key), so every TTS/STT model was guaranteed a
    false WRONG_EP. They now probe the default route, where an end-of-life
    model answers 410 -> RETIRED.
    """

    def test_audio_routes_are_not_probed(self):
        import model_health
        self.assertNotIn('tts', model_health.SPECIAL_ROUTES)
        self.assertNotIn('stt', model_health.SPECIAL_ROUTES)

    def test_embedding_route_is_kept(self):
        import model_health
        self.assertEqual(model_health.SPECIAL_ROUTES['embedding'], '/v1/embeddings')


class TestOverviewMemoryBigNumberHasNoPercent(unittest.TestCase):
    """2026-10-08 open loop: the user circled the Memory card's big-number %
    in red. The CPU card and the Core 1/Core 2 sub-boxes keep their units;
    only the Memory big number is bare.
    """

    def _memory_big_number_line(self):
        src = (Path(__file__).resolve().parent.parent
               / 'src' / 'features' / 'overview' / 'index.jsx').read_text(
                   encoding='utf-8')
        for line in src.splitlines():
            if 'smoothRamPercent' in line and 'overview-telemetry-figure' not in line:
                if 'hasRealTelemetry' in line and '<>' in line:
                    return line
        return None

    def test_memory_big_number_has_no_unit_span(self):
        line = self._memory_big_number_line()
        self.assertIsNotNone(line, 'memory big-number render line not found')
        self.assertNotIn('overview-unit', line,
                         'Memory big number must render bare (no % span)')

    def test_cpu_big_number_keeps_its_unit(self):
        src = (Path(__file__).resolve().parent.parent
               / 'src' / 'features' / 'overview' / 'index.jsx').read_text(
                   encoding='utf-8')
        cpu_lines = [l for l in src.splitlines()
                     if 'smoothCpu' in l and 'overview-unit' in l]
        self.assertTrue(cpu_lines, 'cpu big-number render line not found')

    def test_core_sub_boxes_keep_their_percent(self):
        src = (Path(__file__).resolve().parent.parent
               / 'src' / 'features' / 'overview' / 'index.jsx').read_text(
                   encoding='utf-8')
        self.assertIn('core.value}%', src,
                      'Core 1/Core 2 sub-boxes must keep their % labels')


class TestProbeUrlJoin(unittest.TestCase):
    """The /models sync recorded all 91 registry entries WRONG_EP because
    _probe joined a base that already ends in /v1 with routes that also start
    with /v1, producing /v1/v1/chat/completions. The nginx 404 that came back
    did not match the retired-function body, so every model was misreported.
    """

    def _probe_url(self, base, route):
        import model_health
        captured = {}

        class FakeResp:
            status_code = 200
            text = 'ok'

        def fake_post(url, **kw):
            captured['url'] = url
            return FakeResp()

        mock_req = MagicMock()
        mock_req.post = staticmethod(fake_post)
        with patch.object(model_health, 'requests', mock_req):
            model_health._probe(base, 'k', 'vendor/model-x', route)
        return captured['url']

    def test_base_with_v1_and_route_with_v1_join_once(self):
        self.assertEqual(
            self._probe_url('https://integrate.api.nvidia.com/v1',
                            '/v1/chat/completions'),
            'https://integrate.api.nvidia.com/v1/chat/completions')

    def test_base_without_v1_keeps_route_v1(self):
        self.assertEqual(
            self._probe_url('https://integrate.api.nvidia.com',
                            '/v1/chat/completions'),
            'https://integrate.api.nvidia.com/v1/chat/completions')

    def test_special_routes_join_once(self):
        for route in ('/v1/embeddings', '/v1/audio/speech',
                      '/v1/audio/transcriptions', '/v1/images/generations'):
            self.assertEqual(
                self._probe_url('https://integrate.api.nvidia.com/v1', route),
                'https://integrate.api.nvidia.com/v1' + route[3:], route)

    def test_live_catalog_url_is_unchanged(self):
        # The catalog fetch already built the right URL; it must not regress.
        import model_health
        captured = {}

        class FakeResp:
            status_code = 200

            def json(self):
                return {'data': [{'id': 'vendor/model-x'}]}

        def fake_get(url, **kw):
            captured['url'] = url
            return FakeResp()

        mock_req = MagicMock()
        mock_req.get = staticmethod(fake_get)
        model_health._catalog_cache.update({'ids': set(), 'at': 0})
        with patch.object(model_health, 'requests', mock_req):
            ids = model_health.live_catalog(
                'https://integrate.api.nvidia.com/v1', 'k')
        self.assertEqual(captured['url'],
                         'https://integrate.api.nvidia.com/v1/models')
        self.assertEqual(ids, {'vendor/model-x'})


class TestCatalogAbsenceMeansRetired(unittest.TestCase):
    """A model the provider no longer lists AND that answers nothing on any
    route is gone, not mis-routed. NVIDIA answers an end-of-life model with a
    JSON 410; a bare nginx 404 while absent from GET /v1/models means removed.
    The old rule only fired for UNREACHABLE, so 12 models sat as WRONG_EP.
    """

    def _sync_one(self, probe_status, listed):
        import model_health
        calls = {'n': 0}

        def fake_probe(base, key, mid, route):
            calls['n'] += 1
            return probe_status, '404 page not found'

        # A non-empty catalog is what "the provider answered the catalog
        # request" looks like; membership is the only variable here. An empty
        # set means "catalog unavailable" and the code must fail soft.
        def fake_catalog(base, key):
            return {'vendor/model-x'} if listed else {'vendor/other-model'}

        # Fresh registry per call: sync_models' recently-RETIRED skip guard
        # otherwise reuses the previous test's verdict from the module cache.
        model_health._registry = None
        model_health._registry_mtime = [None]
        with patch.object(model_health, '_probe', side_effect=fake_probe), \
             patch.object(model_health, 'live_catalog', side_effect=fake_catalog), \
             patch.object(model_health, '_api_key', return_value='k'), \
             patch.object(model_health, '_save', lambda: None):
            reg = model_health.sync_models([('vendor/model-x', 'text')],
                                           'https://integrate.api.nvidia.com/v1')
        return reg['models']['vendor/model-x']['status'], calls['n']

    def test_404_absent_from_catalog_is_retired(self):
        status, _ = self._sync_one('WRONG_EP', listed=False)
        self.assertEqual(status, 'RETIRED')

    def test_timeout_absent_from_catalog_is_retired(self):
        status, _ = self._sync_one('UNREACHABLE', listed=False)
        self.assertEqual(status, 'RETIRED')

    def test_404_but_listed_stays_wrong_ep(self):
        # Still advertised: the route question is real, do not hide it.
        status, _ = self._sync_one('WRONG_EP', listed=True)
        self.assertEqual(status, 'WRONG_EP')

    def test_timeout_but_listed_is_slow_not_retired(self):
        status, _ = self._sync_one('UNREACHABLE', listed=True)
        self.assertEqual(status, 'SLOW')

    def test_empty_catalog_fails_soft(self):
        # Catalog fetch failed (empty set): keep the probe's own verdict,
        # never reach for RETIRED on missing evidence.
        import model_health

        def fake_probe(base, key, mid, route):
            return 'WRONG_EP', '404 page not found'

        model_health._registry = None
        model_health._registry_mtime = [None]
        with patch.object(model_health, '_probe', side_effect=fake_probe), \
             patch.object(model_health, 'live_catalog', return_value=set()), \
             patch.object(model_health, '_api_key', return_value='k'), \
             patch.object(model_health, '_save', lambda: None):
            reg = model_health.sync_models([('vendor/model-x', 'text')],
                                           'https://integrate.api.nvidia.com/v1')
        self.assertEqual(reg['models']['vendor/model-x']['status'], 'WRONG_EP')


class TestVisibilityPruneUnfilteredCatalog(unittest.TestCase):
    """Pruning must receive the full upstream catalogue before filtering so that
    hidden items are not pruned from hidden_store.json.
    """

    def test_hidden_provider_retains_prune_membership(self):
        import server
        import visibility

        mock_catalog = {
            'providers': [
                {'id': 'p1', 'name': 'Provider 1', 'kind': 'direct', 'model_count': 1, 'models': [{'id': 'p1/m1'}]},
                {'id': 'p2', 'name': 'Provider 2', 'kind': 'direct', 'model_count': 1, 'models': [{'id': 'p2/m2'}]},
            ]
        }

        pruned_p = []
        pruned_m = []

        def fake_prune(kp, km):
            pruned_p.extend(kp)
            pruned_m.extend(km)

        with patch("hermes_gateway.catalog", return_value=mock_catalog), \
             patch("server.config_provider_map", return_value={}), \
             patch("visibility.hidden_providers", return_value={'p1'}), \
             patch("visibility.hidden_models", return_value={'p2/m2'}), \
             patch("visibility.prune", side_effect=fake_prune):
            result = server.get_live_providers()
            # p1 is hidden, so result only contains p2
            self.assertEqual([p['id'] for p in result], ['p2'])
            # prune must have received p1 and p2, and both models
            self.assertIn('p1', pruned_p)
            self.assertIn('p2', pruned_p)
            self.assertIn('p1/m1', pruned_m)
            self.assertIn('p2/m2', pruned_m)


class TestBuildConsoleLogEntriesIsoTimestamp(unittest.TestCase):
    """Console log entries with ISO 8601 'T' timestamps must parse correctly
    and sort chronologically.
    """

    def test_iso_timestamps_sort_chronologically(self):
        import server

        mock_hermes_logs = {
            'logs': [{'time': '2026-10-06 12:00:00,000', 'level': 'INFO', 'logger': 'sys', 'message': 'Hermes log'}]
        }
        mock_call_logs = {
            'calls': [{'status': 200, 'at': '2026-10-06T13:00:00.000Z', 'method': 'POST', 'path': '/v1/chat', 'model': 'gpt-4o'}]
        }

        fake_omni = MagicMock()
        fake_omni.read_call_logs.return_value = mock_call_logs

        with patch("server.get_hermes_logs", return_value=mock_hermes_logs), \
             patch("server.omniroute_logs", fake_omni):
            entries = server.build_console_log_entries(limit=10, level='all')
            self.assertEqual(len(entries), 2)
            # 13:00 is newer than 12:00, so 13:00 should come first in descending order
            self.assertIn('2026-10-06T13:00:00', entries[0]['timestamp'])
            self.assertIn('2026-10-06 12:00:00', entries[1]['timestamp'])


class TestAgentStreamRawModelAndPromptFilter(unittest.TestCase):
    """Raw model strings in session table must resolve model_id cleanly, and
    user prompt SQL must filter out non-text message parts.
    """

    def test_raw_model_string_resolves_model_id(self):
        import sqlite3
        import agent_stream

        conn = sqlite3.connect(':memory:')
        conn.execute(
            "CREATE TABLE session (id TEXT, title TEXT, agent TEXT, model TEXT, directory TEXT, cost REAL, tokens_input INT, tokens_output INT, tokens_reasoning INT, time_created INT, time_updated INT)"
        )
        conn.execute(
            "INSERT INTO session VALUES ('s1', 'Test', 'build', 'anthropic/claude-3-5-sonnet', '/tmp', 0.0, 0, 0, 0, 1000, 1000)"
        )

        with patch("agent_stream._session_live", return_value=(False, 100)), \
             patch("agent_stream._newest_message_model", return_value=None), \
             patch("agent_stream._read_prompts", return_value=[]), \
             patch("agent_stream._read_stream", return_value=[]):
            sessions = agent_stream._read_sessions(conn, include_idle=True)
            self.assertEqual(len(sessions), 1)
            self.assertEqual(sessions[0]['model_id'], 'anthropic/claude-3-5-sonnet')

    def test_read_prompts_sql_filters_text_type(self):
        import sqlite3
        import agent_stream

        conn = sqlite3.connect(':memory:')
        conn.execute("CREATE TABLE message (id TEXT, session_id TEXT, time_created INT, data TEXT)")
        conn.execute("CREATE TABLE part (message_id TEXT, data TEXT)")

        conn.execute("INSERT INTO message VALUES ('m1', 's1', 100, '{\"role\": \"user\"}')")
        # Non-text part and text part for message m1
        conn.execute("INSERT INTO part VALUES ('m1', '{\"type\": \"step-start\"}')")
        conn.execute("INSERT INTO part VALUES ('m1', '{\"type\": \"text\", \"text\": \"Hello World\"}')")

        prompts = agent_stream._read_prompts(conn, 's1')
        self.assertEqual(len(prompts), 1)
        self.assertEqual(prompts[0]['text'], 'Hello World')


class TestPathsDynamicEnvOverrides(unittest.TestCase):
    """Helper functions in paths.py must dynamically query os.environ at call time,
    and live_sync must use hermes_config_path() and omniroute_env_path().
    """

    def test_dynamic_env_override_in_paths(self):
        import paths

        with patch.dict(os.environ, {'HERMES_HOME': '/custom/hermes', 'OMNIROUTE_HOME': '/custom/omniroute'}):
            self.assertEqual(paths.hermes_config_path(), '/custom/hermes/config.yaml')
            self.assertEqual(paths.omniroute_env_path(), '/custom/omniroute/.env')

    def test_live_sync_uses_paths_helpers(self):
        import live_sync
        from unittest.mock import mock_open

        with patch.object(live_sync, "hermes_config_path", return_value="/override/config.yaml") as mock_cfg, \
             patch("builtins.open", mock_open(read_data="providers: {}")):
            live_sync.fetch_hermes_config()
            mock_cfg.assert_called_once()

        with patch.object(live_sync, "omniroute_env_path", return_value="/override/.env") as mock_env, \
             patch("live_sync._read_env_file", return_value={'OMNIROUTE_API_KEY': 'testkey'}) as mock_read:
            ep = live_sync.omniroute_endpoint()
            mock_env.assert_called_once()
            mock_read.assert_called_once_with("/override/.env")


if __name__ == "__main__":
    unittest.main(verbosity=2)

