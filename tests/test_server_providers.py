import os
import sys
import unittest
from unittest.mock import patch, mock_open, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import server

CONFIG_YAML_DATA = """
providers:
  nvidia:
    api_key: nv-test-key
    enabled: true
    base_url: https://integrate.api.nvidia.com/v1
    models: []
"""

class TestServerProviders(unittest.TestCase):
    @patch('model_health.get_health_map', return_value={})
    @patch('requests.get')
    @patch('builtins.open', new_callable=lambda: mock_open(read_data=CONFIG_YAML_DATA))
    def test_get_hermes_config_providers_success(self, mock_file, mock_requests_get, mock_health):
        # Reset server cache
        server._cached_providers = None
        server._last_provider_time = 0

        # Mock NVIDIA API 200 response
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            'data': [
                {'id': 'nvidia/llama-3.1-405b-instruct'}
            ]
        }
        mock_requests_get.return_value = mock_resp

        providers = server.get_hermes_config_providers()
        self.assertEqual(len(providers), 1)
        nvidia = providers[0]
        self.assertEqual(nvidia['status'], 'Healthy')
        # Check that visual_genai_models were appended without crashing
        model_ids = [m['id'] for m in nvidia['models']]
        self.assertIn('nvidia/llama-3.1-405b-instruct', model_ids)
        self.assertIn('stabilityai/stable-diffusion-3.5-large', model_ids)

if __name__ == '__main__':
    unittest.main()
