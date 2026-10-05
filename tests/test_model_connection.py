import unittest
import urllib.request
import urllib.error
import json

class TestModelConnectionEndpoints(unittest.TestCase):
    BASE_URL = "http://127.0.0.1:5174"

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
