"""Live checks for the model-connection endpoints.

The handler is the REAL `server.TelemetryHandler`, started in-process on an
ephemeral port in setUpClass. The suite therefore runs offline — no external
server on :5174 is required, and `unittest discover` never sees a connection
error. POST /api/model/active writes active_model_store.json, so the original
file is snapshotted and restored around the test.
"""
import importlib.util
import json
import os
import shutil
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import HTTPServer

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)
STORE_FILE = os.path.join(REPO_ROOT, 'active_model_store.json')


def _load_server_module():
    """Import server.py without binding :5174 (the server only starts under
    __main__, so a plain module import is side-effect free apart from caches)."""
    spec = importlib.util.spec_from_file_location(
        'nexus_server_under_test', os.path.join(REPO_ROOT, 'server.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestModelConnectionEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.srv_mod = _load_server_module()
        cls.httpd = HTTPServer(('127.0.0.1', 0), cls.srv_mod.TelemetryHandler)
        cls.port = cls.httpd.server_address[1]
        cls.base = f'http://127.0.0.1:{cls.port}'
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def test_connection_health_endpoint(self):
        req = urllib.request.Request(f"{self.base}/api/model/connection-health")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                self.assertEqual(resp.status, 200)
                data = json.loads(resp.read().decode())
                self.assertIn("status", data)
                self.assertIn("latency_ms", data)
                self.assertIn("active_model", data)
        except urllib.error.HTTPError as e:
            self.fail(f"HTTPError: {e.code} {e.reason}")

    def test_set_active_model_endpoint(self):
        # The endpoint writes the repo's active_model_store.json; keep the
        # existing file and restore it so the test leaves no residue.
        backup_fd, backup_path = tempfile.mkstemp(prefix='nexus-store-', suffix='.json')
        os.close(backup_fd)
        had_store = os.path.exists(STORE_FILE)
        if had_store:
            shutil.copy2(STORE_FILE, backup_path)
        try:
            payload = json.dumps({"model": "test/model-alpha", "provider": "openrouter"}).encode()
            req = urllib.request.Request(
                f"{self.base}/api/model/active",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    self.assertEqual(resp.status, 200)
                    data = json.loads(resp.read().decode())
                    self.assertTrue(data.get("ok"))
                    self.assertEqual(data.get("active_model"), "test/model-alpha")
            except urllib.error.HTTPError as e:
                self.fail(f"HTTPError: {e.code} {e.reason}")
        finally:
            if had_store:
                shutil.copy2(backup_path, STORE_FILE)
            elif os.path.exists(STORE_FILE):
                os.remove(STORE_FILE)
            os.remove(backup_path)


if __name__ == "__main__":
    unittest.main()
