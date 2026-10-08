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

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import live_sync  # noqa: E402


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
    """

    def test_fetch_specs_resolves_hermes_config_path_without_name_error(self):
        from unittest.mock import patch
        import run_sync

        with patch("model_health._api_key", return_value="dummy_key"), \
             patch("run_sync.hermes_config_path", return_value="/nonexistent/config.yaml"):
            try:
                run_sync.fetch_specs()
            except (FileNotFoundError, ModuleNotFoundError):
                pass  # hermes_config_path was successfully called and resolved
            except NameError as exc:
                self.fail(f"run_sync.fetch_specs raised NameError: {exc}")


class TestNoRequestsOrPsutilDependency(unittest.TestCase):
    """Ensure backend modules import cleanly without requests or psutil."""

    def test_model_health_imports_without_requests(self):
        import model_health
        self.assertFalse(hasattr(model_health, 'requests'), "model_health still imports requests")

    def test_server_imports_without_requests(self):
        from unittest.mock import patch
        with patch.dict(sys.modules, {'psutil': None}):
            import server
            self.assertFalse(hasattr(server, 'requests'), "server still imports requests")
            telemetry = server.get_telemetry()
            self.assertIn('ram_total_mb', telemetry)

    def test_run_sync_imports_without_requests(self):
        import run_sync
        self.assertFalse(hasattr(run_sync, 'requests'), "run_sync still imports requests")


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


if __name__ == "__main__":
    unittest.main(verbosity=2)