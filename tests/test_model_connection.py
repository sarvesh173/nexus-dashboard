import unittest
import urllib.request
import urllib.error
import json

import os
import sys
import threading
from http.server import HTTPServer

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import server


class TestModelConnectionEndpoints(unittest.TestCase):
    BASE_URL = "http://127.0.0.1:5174"
    httpd = None

    @classmethod
    def setUpClass(cls):
        try:
            req = urllib.request.Request(f"{cls.BASE_URL}/api/stats")
            with urllib.request.urlopen(req, timeout=1):
                pass
        except Exception:
            try:
                cls.httpd = HTTPServer(('127.0.0.1', 5174), server.TelemetryHandler)
                t = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
                t.start()
            except Exception as exc:
                print(f"Test server start skipped: {exc}")

    @classmethod
    def tearDownClass(cls):
        if cls.httpd:
            cls.httpd.shutdown()

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
