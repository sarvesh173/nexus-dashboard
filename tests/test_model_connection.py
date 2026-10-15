import os
import sys
import unittest
import urllib.request
import urllib.error
import json
import threading
from http.server import HTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import server as srv


class TestModelConnectionEndpoints(unittest.TestCase):
    httpd = None
    server_thread = None
    BASE_URL = ""

    @classmethod
    def setUpClass(cls):
        srv.TelemetryHandler.log_message = lambda *a, **k: None
        cls.httpd = HTTPServer(('127.0.0.1', 0), srv.TelemetryHandler)
        port = cls.httpd.server_address[1]
        cls.BASE_URL = f"http://127.0.0.1:{port}"
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        if cls.httpd:
            cls.httpd.shutdown()
            cls.httpd.server_close()

    def test_connection_health_endpoint(self):
        req = urllib.request.Request(f"{self.BASE_URL}/api/model/connection-health")
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                self.assertEqual(resp.status, 200)
                data = json.loads(resp.read().decode())
                self.assertIn("status", data)
                self.assertIn("latency_ms", data)
                self.assertIn("active_model", data)
        except urllib.error.HTTPError as e:
            self.fail(f"HTTPError: {e.code} {e.reason}")

    def test_set_active_model_endpoint(self):
        payload = json.dumps({"model": "test/model-alpha", "provider": "openrouter"}).encode()
        req = urllib.request.Request(
            f"{self.BASE_URL}/api/model/active",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                self.assertEqual(resp.status, 200)
                data = json.loads(resp.read().decode())
                self.assertTrue(data.get("ok"))
                self.assertEqual(data.get("active_model"), "test/model-alpha")
        except urllib.error.HTTPError as e:
            self.fail(f"HTTPError: {e.code} {e.reason}")

if __name__ == "__main__":
    unittest.main()
