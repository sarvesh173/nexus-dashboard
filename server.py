from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import psutil
import subprocess
import os
import time
import yaml
import requests

_cached_data = None
_last_poll_time = 0
CACHE_TTL = 7.0  # 7-second hardware polling delay to reduce CPU overhead

_cached_providers = None
_last_provider_time = 0
PROVIDER_CACHE_TTL = 60.0  # 60s cache for provider model sync

def get_telemetry():
    global _cached_data, _last_poll_time
    now = time.time()
    if _cached_data is not None and (now - _last_poll_time) < CACHE_TTL:
        return _cached_data

    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    per_cpu = psutil.cpu_percent(interval=None, percpu=True)
    cpu_pct = psutil.cpu_percent(interval=None)
    disk = psutil.disk_usage('/')
    
    nexus_mem_mb = 0
    try:
        res = subprocess.check_output(['systemctl', '--user', 'show', 'nexus-dashboard.service', '--property=MemoryCurrent'], text=True)
        val = res.strip().split('=')[1]
        if val.isdigit():
            nexus_mem_mb = round(int(val) / (1024 * 1024), 1)
    except Exception:
        pass
    
    _cached_data = {
        'ram_total_mb': round(mem.total / (1024 * 1024)),
        'ram_used_mb': round(mem.used / (1024 * 1024)),
        'ram_free_mb': round(mem.available / (1024 * 1024)),
        'ram_percent': round(mem.percent, 1),
        'swap_total_mb': round(swap.total / (1024 * 1024)),
        'swap_used_mb': round(swap.used / (1024 * 1024)),
        'swap_free_mb': round(swap.free / (1024 * 1024)),
        'swap_percent': round(swap.percent, 1),
        'cpu_percent': round(cpu_pct, 1),
        'cpu_cores': per_cpu if len(per_cpu) >= 2 else [round(cpu_pct, 1), round(cpu_pct, 1)],
        'disk_percent': round(disk.percent, 1),
        'nexus_mem_mb': nexus_mem_mb
    }
    _last_poll_time = now
    return _cached_data

def get_hermes_config_providers():
    global _cached_providers, _last_provider_time
    now = time.time()
    if _cached_providers is not None and (now - _last_provider_time) < PROVIDER_CACHE_TTL:
        return _cached_providers

    config_path = '/home/kira/.hermes/config.yaml'
    try:
        with open(config_path, 'r') as f:
            cfg = yaml.safe_load(f)
    except Exception as e:
        cfg = {}

    providers_raw = cfg.get('providers', {})
    result_providers = []

    # Process NVIDIA provider specifically
    if 'nvidia' in providers_raw:
        n_cfg = providers_raw['nvidia']
        api_key = n_cfg.get('api_key')
        base_url = n_cfg.get('base_url', 'https://integrate.api.nvidia.com/v1')
        enabled = n_cfg.get('enabled', True)
        configured_models = n_cfg.get('models', [])

        models_list = []
        api_status = 'Healthy'
        rate_limit_info = 'Free Tier (40 RPM limit)'

        # Fetch live models from NVIDIA API
        try:
            headers = {'Authorization': f'Bearer {api_key}'} if api_key else {}
            resp = requests.get(f'{base_url}/models', headers=headers, timeout=8)
            if resp.status_code == 200:
                data = resp.json().get('data', [])
                for item in data:
                    mid = item.get('id', '')
                    mname = mid.split('/')[-1].replace('-', ' ').title() if '/' in mid else mid
                    mid_lower = mid.lower()

                    # Filter: Daily Use vs Specialized Non-Daily
                    scope = 'daily'
                    specialized_tag = None
                    host_type = 'Cloud API'

                    # Detect specific modal execution endpoints for backend repair/agent inspection
                    if any(k in mid_lower for k in ['embed', 'retriever', 'clip']):
                        cat = 'embedding'
                        endpoint_route = '/v1/embeddings'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['diffusion', 'sdxl', 'flux']):
                        cat = 'image'
                        endpoint_route = '/v1/genai/image/generations'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['vision', 'fuyu', 'kosmos', 'neva', 'vila', 'image']):
                        cat = 'image'
                        endpoint_route = '/v1/chat/completions'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['tts', 'voice', 'speech', 'audio']):
                        cat = 'tts'
                        endpoint_route = '/v1/audio/speech'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['stt', 'whisper', 'transcribe', 'asr', 'riva-translate', 'translate']):
                        cat = 'stt'
                        endpoint_route = '/v1/audio/transcriptions'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['med', 'drug', 'bio', 'molecule']):
                        scope = 'specialized'
                        cat = 'specialized'
                        specialized_tag = 'Biomedical / Healthcare'
                        endpoint_route = '/v1/chat/completions'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['synthetic-video', 'detector']):
                        scope = 'specialized'
                        cat = 'specialized'
                        specialized_tag = 'Forensics / Detection'
                        endpoint_route = '/v1/cv/synthetic-video-detection'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['route', 'weather', 'simulation', 'calibration']):
                        scope = 'specialized'
                        cat = 'specialized'
                        specialized_tag = 'Physics & Simulation'
                        endpoint_route = '/v1/physics/simulation'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['robot', 'isaac', 'arm', 'spatial']):
                        scope = 'specialized'
                        cat = 'specialized'
                        specialized_tag = 'Robotics & Embodied AI'
                        endpoint_route = '/v1/robotics/spatial-action'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['guard', 'safety', 'reward']):
                        scope = 'specialized'
                        cat = 'specialized'
                        specialized_tag = 'Safety Guardrail'
                        endpoint_route = '/v1/chat/completions'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['parse', 'ocr', 'deplot']):
                        scope = 'specialized'
                        cat = 'specialized'
                        specialized_tag = 'Doc / OCR Parsing'
                        endpoint_route = '/v1/chat/completions'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['reason', 'dbrx', 'thinking']):
                        cat = 'decision'
                        endpoint_route = '/v1/chat/completions'
                        request_method = 'POST'
                    else:
                        cat = 'text' # Core LLM
                        endpoint_route = '/v1/chat/completions'
                        request_method = 'POST'

                    is_active = mid in configured_models or len(configured_models) == 0

                    models_list.append({
                        'id': mid,
                        'name': mname,
                        'category': cat,
                        'scope': scope,
                        'specialized_tag': specialized_tag,
                        'host_type': host_type,
                        'provider': 'NVIDIA NIM',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active' if is_active else 'Available',
                        'configured_in_hermes': mid in configured_models,
                        'context': {
                            'original': 'Up to 128k',
                            'system': 'NVIDIA NIM Hosted'
                        },
                        'description': f'Official NVIDIA NIM model: {mid}',
                        # Hidden technical metadata for autonomous agents / backend diagnostic scripts
                        '__technical_agent_manifest__': {
                            'full_endpoint_url': f'{base_url.rstrip("/")}{endpoint_route}',
                            'route': endpoint_route,
                            'method': request_method,
                            'auth_type': 'Bearer API Key',
                            'headers': {'Authorization': 'Bearer [HERMES_ENV_NVIDIA_API_KEY]'},
                            'upstream_provider': 'NVIDIA Cloud Functions (NVCF)',
                            'cli_compatible': True,
                            'payload_schema': 'openai_compatible_json'
                        }
                    })

                # Speech Models from NVIDIA Riva NIM catalog with verified local vs cloud host types & exact NVCF gRPC IDs
                speech_models = [
                    {
                        'id': 'nvidia/magpie-tts-multilingual',
                        'name': 'Magpie TTS Multilingual',
                        'category': 'tts',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud API & Local NGC NIM',
                        'provider': 'NVIDIA Riva NIM',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': 'Native Audio', 'system': 'Riva Streaming'},
                        'description': 'Real-time neural speech synthesis pipeline optimized for natural conversational agents.',
                        '__technical_agent_manifest__': {
                            'protocol': 'gRPC over TLS',
                            'grpc_server': 'grpc.nvcf.nvidia.com:443',
                            'nvcf_function_id': '877104f7-e885-42b9-8de8-f6e4c6303969',
                            'client_library': 'nvidia-riva-client',
                            'pip_install': 'pip install nvidia-riva-client',
                            'git_repo': 'https://github.com/nvidia-riva/python-clients.git',
                            'cli_command': 'python python-clients/scripts/tts/talk.py --server grpc.nvcf.nvidia.com:443 --use-ssl --metadata function-id "877104f7-e885-42b9-8de8-f6e4c6303969" --metadata "authorization" "Bearer $NVIDIA_API_KEY" --text "Hello from Alya"',
                            'upstream_provider': 'NVIDIA Riva NVCF',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/nvidia/magpie-tts-multilingual/api'
                        }
                    },
                    {
                        'id': 'nvidia/chatterbox-multilingual-tts',
                        'name': 'Chatterbox Multilingual TTS',
                        'category': 'tts',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Local NGC Container (Local Run Required)',
                        'provider': 'NVIDIA Riva NIM',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Local',
                        'output_pricing': '$0.00 / Local',
                        'rate_limit': 'Local Hardware',
                        'status': 'Downloadable / Local',
                        'configured_in_hermes': False,
                        'context': {'original': 'Local GPU/CPU', 'system': 'NGC Container'},
                        'description': 'High-fidelity multilingual speech synthesis designed for on-premise local Docker/NIM deployment.',
                        '__technical_agent_manifest__': {
                            'protocol': 'gRPC / Docker Container',
                            'grpc_server': 'grpc.nvcf.nvidia.com:443 (or localhost:50051)',
                            'nvcf_function_id': 'ddacc747-1269-4fab-bfd9-8f593dead106',
                            'client_library': 'nvidia-riva-client',
                            'pip_install': 'pip install nvidia-riva-client',
                            'git_repo': 'https://github.com/nvidia-riva/python-clients.git',
                            'cli_command': 'python python-clients/scripts/tts/talk.py --server grpc.nvcf.nvidia.com:443 --use-ssl --metadata function-id "ddacc747-1269-4fab-bfd9-8f593dead106" --metadata "authorization" "Bearer $NVIDIA_API_KEY"',
                            'upstream_provider': 'NGC Docker Container / NVCF',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/nvidia/chatterbox-multilingual-tts/api'
                        }
                    },
                    {
                        'id': 'nvidia/parakeet-ctc-0.6b-asr',
                        'name': 'Parakeet CTC 0.6B ASR',
                        'category': 'stt',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud API & Local NGC NIM',
                        'provider': 'NVIDIA Riva NIM',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': '16-bit Mono WAV', 'system': 'Riva Conformer'},
                        'description': 'State-of-the-art accuracy and speed for English transcriptions with timestamped output.',
                        '__technical_agent_manifest__': {
                            'protocol': 'gRPC over TLS',
                            'grpc_server': 'grpc.nvcf.nvidia.com:443',
                            'nvcf_function_id': 'd8dd4e9b-fbf5-4fb0-9dba-8cf436c8d965',
                            'client_library': 'nvidia-riva-client',
                            'pip_install': 'pip install nvidia-riva-client',
                            'git_repo': 'https://github.com/nvidia-riva/python-clients.git',
                            'cli_command': 'python python-clients/scripts/asr/transcribe_file.py --server grpc.nvcf.nvidia.com:443 --use-ssl --metadata function-id "d8dd4e9b-fbf5-4fb0-9dba-8cf436c8d965" --metadata "authorization" "Bearer $NVIDIA_API_KEY" --language-code en-US --input-file <audio.wav>',
                            'upstream_provider': 'NVIDIA Riva NVCF',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/nvidia/parakeet-ctc-0_6b-asr/api'
                        }
                    },
                    {
                        'id': 'nvidia/parakeet-tdt-0.6b-v2',
                        'name': 'Parakeet TDT 0.6B v2',
                        'category': 'stt',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud API & Local NGC NIM',
                        'provider': 'NVIDIA Riva NIM',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': '30s chunking', 'system': '6.05% WER'},
                        'description': 'State-of-the-art fast conformer automatic speech recognition with 3386x real-time factor.',
                        '__technical_agent_manifest__': {
                            'protocol': 'gRPC over TLS',
                            'grpc_server': 'grpc.nvcf.nvidia.com:443',
                            'nvcf_function_id': 'd3fe9151-442b-4204-a70d-5fcc597fd610',
                            'client_library': 'nvidia-riva-client',
                            'pip_install': 'pip install nvidia-riva-client',
                            'git_repo': 'https://github.com/nvidia-riva/python-clients.git',
                            'cli_command': 'python python-clients/scripts/asr/transcribe_file.py --server grpc.nvcf.nvidia.com:443 --use-ssl --metadata function-id "d3fe9151-442b-4204-a70d-5fcc597fd610" --metadata "authorization" "Bearer $NVIDIA_API_KEY" --language-code en-US --input-file <audio.wav>',
                            'upstream_provider': 'NVIDIA Riva NVCF',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/nvidia/parakeet-tdt-0_6b-v2/api'
                        }
                    },
                    {
                        'id': 'nvidia/canary-1b-asr',
                        'name': 'Canary 1B Multilingual ASR',
                        'category': 'stt',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud API & Local NGC NIM',
                        'provider': 'NVIDIA Riva NIM',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': '30s chunking', 'system': 'Multilingual ASR'},
                        'description': 'Top-tier multi-lingual speech-to-text recognition and real-time audio translation.',
                        '__technical_agent_manifest__': {
                            'protocol': 'gRPC over TLS',
                            'grpc_server': 'grpc.nvcf.nvidia.com:443',
                            'nvcf_function_id': 'b0e8b4a5-217c-40b7-9b96-17d84e666317',
                            'client_library': 'nvidia-riva-client',
                            'pip_install': 'pip install nvidia-riva-client',
                            'git_repo': 'https://github.com/nvidia-riva/python-clients.git',
                            'cli_command': 'python python-clients/scripts/asr/transcribe_file.py --server grpc.nvcf.nvidia.com:443 --use-ssl --metadata function-id "b0e8b4a5-217c-40b7-9b96-17d84e666317" --metadata "authorization" "Bearer $NVIDIA_API_KEY" --language-code en-US --input-file <audio.wav>',
                            'upstream_provider': 'NVIDIA Riva NVCF',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/nvidia/canary-1b-asr/api'
                        }
                    }
                ]
                for sm in speech_models:
                    if not any(m['id'] == sm['id'] for m in models_list):
                        models_list.append(sm)
            else:
                api_status = f'HTTP {resp.status_code}'
        except Exception as e:
            api_status = 'Unavailable'

        daily_models = [m for m in models_list if m.get('scope') == 'daily']
        spec_models = [m for m in models_list if m.get('scope') == 'specialized']

        result_providers.append({
            'id': 'nvidia',
            'name': 'NVIDIA NIM',
            'display_name': 'NVIDIA AI Foundation & NIM',
            'logo': '/agent-logos/nvidia.svg',
            'status': api_status,
            'enabled': enabled,
            'rate_limit': rate_limit_info,
            'base_url': base_url,
            'website_url': 'https://build.nvidia.com/models',
            'total_models': len(models_list),
            'daily_count': len(daily_models),
            'specialized_count': len(spec_models),
            'models': models_list,
            'categories': {
                'text': len([m for m in daily_models if m['category'] == 'text']),
                'image': len([m for m in daily_models if m['category'] == 'image']),
                'video': len([m for m in daily_models if m['category'] == 'video']),
                'tts': len([m for m in daily_models if m['category'] == 'tts']),
                'stt': len([m for m in daily_models if m['category'] == 'stt']),
                'embedding': len([m for m in daily_models if m['category'] == 'embedding']),
                'decision': len([m for m in daily_models if m['category'] == 'decision']),
                'specialized': len(spec_models)
            }
        })

    _cached_providers = result_providers
    _last_provider_time = now
    return _cached_providers

class TelemetryHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/stats':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data = get_telemetry()
            self.wfile.write(json.dumps(data).encode('utf-8'))
        elif self.path == '/api/providers':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data = get_hermes_config_providers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 5174), TelemetryHandler)
    server.serve_forever()
