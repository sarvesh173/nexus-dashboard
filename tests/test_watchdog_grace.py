#!/usr/bin/env python3
"""Offline checks for the service watchdog.

Two regressions are locked here:
1. scripts/nexus_watchdog.py must not hardcode a personal home directory
   (DIVISION-RULE non-negotiable) and must resolve its cache paths through
   paths.py regardless of the working directory it is launched from.
2. After a restart the watchdog must give the service a startup grace window
   long enough for vite preview to bind :5173. The old 3s pause produced a
   restart loop (59 restarts on 2026-10-15).

No network, no credentials, no systemd calls: every side effect is stubbed.
"""
import importlib.util
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parent.parent
WATCHDOG = REPO_ROOT / "scripts" / "nexus_watchdog.py"

sys.path.insert(0, str(REPO_ROOT))
from paths import REPO_DIR  # noqa: E402


def _load_watchdog():
    """Import the watchdog from an arbitrary cwd, like the systemd unit does."""
    spec = importlib.util.spec_from_file_location("nexus_watchdog_under_test",
                                                  WATCHDOG)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestWatchdogPaths(unittest.TestCase):
    def test_no_personal_home_directory_in_source(self):
        src = WATCHDOG.read_text(encoding="utf-8")
        self.assertNotIn("/home/", src,
                         "watchdog must resolve paths via paths.py, not a "
                         "literal home directory (DIVISION-RULE)")

    def test_paths_resolve_under_repo_cache_dir(self):
        wd = _load_watchdog()
        expected = os.path.join(REPO_DIR, "cache")
        self.assertEqual(wd.LOG_FILE, os.path.join(expected, "watchdog.log"))
        self.assertEqual(wd.STATUS_FILE,
                         os.path.join(expected, "watchdog_agents_status.json"))

    def test_import_is_cwd_independent(self):
        before = os.getcwd()
        os.chdir("/tmp")
        try:
            wd = _load_watchdog()
            self.assertTrue(wd.LOG_FILE.startswith(REPO_DIR))
        finally:
            os.chdir(before)


class TestWatchdogRestartGrace(unittest.TestCase):
    """A restarted service gets RESTART_GRACE_SECONDS before the probe counter
    can re-cross the threshold. Virtual time makes the while-True loop
    deterministic without sleeping for real."""

    LIMIT = 90  # virtual seconds before the harness breaks the loop

    def _run_loop(self, module):
        clock = {"t": 0.0}

        class StopLoop(Exception):
            pass

        def fake_sleep(seconds):
            clock["t"] += seconds
            if clock["t"] > self.LIMIT:
                raise StopLoop()

        restarts = []

        def fake_restart(name):
            restarts.append((name, clock["t"]))

        with patch.object(module, "check_url", return_value=False), \
             patch.object(module, "restart_service", side_effect=fake_restart), \
             patch.object(module.time, "sleep", side_effect=fake_sleep), \
             patch.object(module, "log", lambda msg: None), \
             patch.object(module, "run_webhook_server", lambda: None):
            try:
                module.main()
            except StopLoop:
                pass
        return restarts, clock["t"]

    def test_grace_constants_are_sane(self):
        wd = _load_watchdog()
        self.assertGreaterEqual(wd.RESTART_GRACE_SECONDS, 10)
        self.assertGreaterEqual(wd.PROBE_INTERVAL, 1)

    def test_no_restart_storms_within_the_window(self):
        wd = _load_watchdog()
        restarts, elapsed = self._run_loop(wd)
        for name in ("nexus-dashboard.service", "nexus-telemetry.service"):
            times = [t for n, t in restarts if n == name]
            # With the old 3s grace the log showed a restart every ~8-13s;
            # the fixed loop cannot re-cross the threshold before
            # GRACE + one full probe interval has elapsed.
            for prev, nxt in zip(times, times[1:]):
                self.assertGreaterEqual(
                    nxt - prev,
                    wd.RESTART_GRACE_SECONDS + wd.PROBE_INTERVAL,
                    f"{name} restarted again after only {nxt - prev:.0f}s")

    def test_a_truly_dead_service_is_still_restarted(self):
        # The grace must not disable the watchdog: a dead service still gets
        # restarted, just not in a storm.
        wd = _load_watchdog()
        restarts, elapsed = self._run_loop(wd)
        self.assertGreaterEqual(len(restarts), 1)
        self.assertGreater(elapsed, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
