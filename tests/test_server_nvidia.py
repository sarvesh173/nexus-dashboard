import unittest
from unittest.mock import MagicMock, patch
import sys

# Mock missing system modules if they are not installed in test environment
for mod_name in ['psutil', 'yaml', 'requests']:
    if mod_name not in sys.modules:
        sys.modules[mod_name] = MagicMock()

import server


class TestServerNvidiaProviders(unittest.TestCase):

    @patch('server.requests.get')
    @patch('builtins.open')
    def test_get_hermes_config_providers_existing_ids(self, mock_open, mock_requests_get):
        # Reset provider cache to ensure function executes fresh
        server._cached_providers = None
        server._last_provider_time = 0

        # Mock YAML config loaded in server module
        server.yaml.safe_load.return_value = {
            'providers': {
                'nvidia': {
                    'api_key': 'test-key',
                    'base_url': 'https://integrate.api.nvidia.com/v1',
                    'enabled': True,
                    'models': ['meta/llama-3.1-405b-instruct']
                }
            }
        }

        # Mock NVIDIA API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': [
                {'id': 'meta/llama-3.1-405b-instruct'},
                {'id': 'nvidia/neva-22b'}
            ]
        }
        mock_requests_get.return_value = mock_response

        providers = server.get_hermes_config_providers()

        self.assertEqual(len(providers), 1)
        nvidia_provider = providers[0]
        self.assertEqual(nvidia_provider['id'], 'nvidia')
        self.assertEqual(nvidia_provider['status'], 'Healthy')

        # Verify that visual_genai_models and speech_models were appended without NameError
        model_ids = [m['id'] for m in nvidia_provider['models']]
        self.assertIn('meta/llama-3.1-405b-instruct', model_ids)
        self.assertIn('stabilityai/stable-diffusion-3.5-large', model_ids)
        self.assertIn('nvidia/magpie-tts-multilingual', model_ids)


if __name__ == '__main__':
    unittest.main()
