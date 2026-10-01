from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import psutil
import subprocess
import os
import sys
import time
import yaml
import requests

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

try:
    import model_health
except ImportError:
    model_health = None

try:
    import hermes_gateway
except ImportError:
    hermes_gateway = None

try:
    import visibility
except ImportError:
    visibility = None

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
                    elif any(k in mid_lower for k in ['diffusion', 'sdxl', 'flux', 'sana']):
                        cat = 'image-gen'
                        endpoint_route = '/v1/genai/image/generations'
                        request_method = 'POST'
                    elif any(k in mid_lower for k in ['vision', 'fuyu', 'kosmos', 'neva', 'vila', '-vl-', 'vlm', 'paligemma']):
                        cat = 'vision'
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

                # Dedicated Visual GenAI Models (Text-to-Image & Video Generation) from NVIDIA Catalog
                visual_genai_models = [
                    {
                        'id': 'stabilityai/stable-diffusion-3.5-large',
                        'name': 'Stable Diffusion 3.5 Large',
                        'category': 'image-gen',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud NIM API',
                        'provider': 'Stability AI (NVIDIA NIM)',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': '1024x1024 Native', 'system': 'Multi-Prompt Diffusion'},
                        'description': 'Popular text-to-image 8B parameter foundation model with high quality photorealistic generation.',
                        '__technical_agent_manifest__': {
                            'full_endpoint_url': 'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3_5-large',
                            'route': '/v1/genai/stabilityai/stable-diffusion-3_5-large',
                            'method': 'POST',
                            'auth_type': 'Bearer API Key',
                            'headers': {'Authorization': 'Bearer [HERMES_ENV_NVIDIA_API_KEY]'},
                            'upstream_provider': 'NVIDIA NIM Visual GenAI',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/stabilityai/stable-diffusion-3_5-large'
                        }
                    },
                    {
                        'id': 'stabilityai/stable-diffusion-xl',
                        'name': 'Stable Diffusion XL',
                        'category': 'image-gen',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud NIM API',
                        'provider': 'Stability AI (NVIDIA NIM)',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': '1024x1024 Native', 'system': 'SDXL Latent Diffusion'},
                        'description': 'High-performance text-to-image generative model producing realistic aesthetics and typography.',
                        '__technical_agent_manifest__': {
                            'full_endpoint_url': 'https://ai.api.nvidia.com/v1/genai/stabilityai/sdxl',
                            'route': '/v1/genai/stabilityai/sdxl',
                            'method': 'POST',
                            'auth_type': 'Bearer API Key',
                            'headers': {'Authorization': 'Bearer [HERMES_ENV_NVIDIA_API_KEY]'},
                            'upstream_provider': 'NVIDIA NIM Visual GenAI',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/stabilityai/stable-diffusion-xl'
                        }
                    },
                    {
                        'id': 'qwen/qwen-image',
                        'name': 'Qwen-Image Text-to-Image',
                        'category': 'image-gen',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud NIM API & Local Container',
                        'provider': 'Qwen (NVIDIA NIM)',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': 'Multilingual Text', 'system': 'Vision-Language Diffusion'},
                        'description': 'Text-to-image foundation model with state-of-the-art multilingual text rendering in images.',
                        '__technical_agent_manifest__': {
                            'full_endpoint_url': 'https://ai.api.nvidia.com/v1/genai/qwen/qwen-image',
                            'route': '/v1/genai/qwen/qwen-image',
                            'method': 'POST',
                            'auth_type': 'Bearer API Key',
                            'headers': {'Authorization': 'Bearer [HERMES_ENV_NVIDIA_API_KEY]'},
                            'upstream_provider': 'NVIDIA NIM Visual GenAI',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/qwen/qwen-image'
                        }
                    },
                    {
                        'id': 'stabilityai/stable-video-diffusion',
                        'name': 'Stable Video Diffusion (SVD)',
                        'category': 'video',
                        'scope': 'daily',
                        'specialized_tag': None,
                        'host_type': 'Cloud NIM API',
                        'provider': 'Stability AI (NVIDIA NIM)',
                        'tier': 'free',
                        'input_pricing': '$0.00 / Free',
                        'output_pricing': '$0.00 / Free',
                        'rate_limit': '40 RPM',
                        'status': 'Active',
                        'configured_in_hermes': True,
                        'context': {'original': 'Image-to-Video', 'system': '14/25 Frame Diffusion'},
                        'description': 'Generative video diffusion model synthesizing dynamic video sequences from conditioning still images.',
                        '__technical_agent_manifest__': {
                            'full_endpoint_url': 'https://ai.api.nvidia.com/v1/video/stabilityai/stable-video-diffusion',
                            'route': '/v1/video/stabilityai/stable-video-diffusion',
                            'method': 'POST',
                            'auth_type': 'Bearer API Key',
                            'headers': {'Authorization': 'Bearer [HERMES_ENV_NVIDIA_API_KEY]'},
                            'upstream_provider': 'NVIDIA NIM Visual GenAI',
                            'cli_compatible': True,
                            'documentation_url': 'https://build.nvidia.com/stabilityai/stable-video-diffusion'
                        }
                    }
                ]

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
                for vm in visual_genai_models:
                    if vm['id'] not in existing_ids:
                        models_list.append(vm)

                for sm in speech_models:
                    if not any(m['id'] == sm['id'] for m in models_list):
                        models_list.append(sm)
            else:
                api_status = f'HTTP {resp.status_code}'
        except Exception as e:
            api_status = 'Unavailable'

        # ---- Auto-hide retired models (live health sync) ----
        health = model_health.get_health_map() if model_health else None
        if health:
            before = len(models_list)
            hidden_ids = []
            kept = []
            for m in models_list:
                st = health.get(m['id'])
                if st == 'RETIRED':
                    hidden_ids.append(m['id'])
                    continue
                kept.append(m)
            models_list = kept
            if hidden_ids:
                print('[health] hid {} retired model(s): {}'.format(
                    len(hidden_ids), ', '.join(hidden_ids[:6]) +
                    (' ...' if len(hidden_ids) > 6 else '')))

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
                'vision': len([m for m in daily_models if m['category'] == 'vision']),
                'image_gen': len([m for m in daily_models if m['category'] == 'image-gen']),
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


_LOGO_HINTS = {
    'deepseek': 'deepseek', 'nvidia': 'nvidia', 'google': 'google',
    'gemini': 'google', 'mistralai': 'mistral', 'qwen': 'qwen',
    'stabilityai': 'stability', 'meta': 'meta', 'moonshotai': 'moonshot',
}


def _logo_for(pid):
    """Return a /logos path only when a real asset exists, else None."""
    cands = []
    if pid in _LOGO_HINTS:
        cands.append(_LOGO_HINTS[pid])
    cands.append(pid)
    base = os.path.dirname(os.path.abspath(__file__))
    for c in cands:
        for ext in ('.svg', '.png'):
            if os.path.exists(os.path.join(base, 'public', 'logos', c + ext)):
                return '/logos/{}{}'.format(c, ext)
    return None


def get_all_config_providers():
    """Every provider in the Hermes config (routers included, marked as such)."""
    try:
        with open('/home/kira/.hermes/config.yaml', 'r') as f:
            cfg = yaml.safe_load(f) or {}
    except Exception:
        cfg = {}

    providers_raw = cfg.get('providers', {}) or {}
    out = []
    for pid, p in (providers_raw or {}).items():
        if not isinstance(p, dict):
            continue
        base = p.get('base_url') or ''
        is_router = any(k in str(base).lower() or k in pid.lower()
                        for k in ('router', 'rout.my', 'literouter', 'apmix',
                                  'freetheai', 'tokenrouter', 'blazeapi', 'crax'))
        models = p.get('models') or {}
        n_models = len(models) if isinstance(models, (dict, list)) else 0
        out.append({
            'id': pid,
            'name': p.get('display_name') or pid.title(),
            'base_url': base or 'official',
            'enabled': p.get('enabled', True),
            'model_count': n_models,
            'discover_models': p.get('discover_models', True),
            'kind': 'router' if is_router else 'direct',
            'logo': (_logo_for(pid) if not is_router else None),
        })
    out.sort(key=lambda x: (x['kind'] != 'direct', -x['model_count']))
    return out




# config provider id -> (gateway prefixes, model-id substring that must match)
# A prefix alone is far too coarse: pointing deepseek at "nvidia" handed the
# card all 65 NVIDIA Nemotron models under a DeepSeek heading. The second
# element filters the borrowed models to ones the brand actually serves.
_PROVIDER_ALIASES = {
    'anthropic': (['agy'], 'claude'),
    'deepseek': (['nvidia', 'qwen-cloud', 'deepseek'], 'deepseek'),
    # curated VIEWS over the mixed OpenRouter catalog, not single brands
    'openai-codex': (['openrouter'], ''),
    'opencode-zen': (['openrouter'], ''),
    'openai': (['openrouter'], 'gpt'),
    'zai': (['nvidia', 'zhipu'], 'glm'),
    'zhipu': (['zhipu', 'nvidia'], 'glm'),
    'qwen': (['qwen-cloud'], 'qwen'),
    'mistral': (['nvidia', 'openrouter'], 'mistral'),
    'meta': (['nvidia'], 'llama'),
    'llama': (['nvidia'], 'llama'),
    'xai': (['nvidia', 'openrouter'], 'grok'),
    'cohere': (['cohere'], 'command'),
    'together': (['openrouter'], ''),
    'groq': (['nvidia'], ''),
}


def _alias_models(pid, merged):
    """Models a config provider really serves, via its gateway prefixes."""
    entry = _PROVIDER_ALIASES.get(pid)
    if not entry:
        return []
    prefixes, needle = entry
    out = []
    for card in merged:
        if card['id'] not in prefixes:
            continue
        for m in (card.get('models') or []):
            if not needle or needle in m.get('id', '').lower():
                # ids are "<gateway>/<vendor>/<model>" for routed catalogs
                # (openrouter/black-forest-labs/flux.2-pro) but only
                # "<gateway>/<vendor>/<model>" for flat ones, so take the
                # segment after the gateway prefix.
                parts = m.get('id', '').split('/')
                vendor = parts[1] if len(parts) > 2 else (parts[0] if parts else '')
                out.append(dict(m, provider=pid, vendor=vendor))
    return out


def get_live_providers():
    """
    Providers + models straight from the Hermes OpenAI-compatible gateway.
    This is the live source of truth: anything the gateway stopped serving is
    simply absent, so hiding a model upstream hides it here on the next sync.
    Config-only providers are merged in (with 0 live models) so nothing is lost.
    """
    live = hermes_gateway.catalog()
    by_prefix = {p['id']: p for p in live['providers']}

    merged = []
    for p in live['providers']:
        cfg = (config_provider_map() or {}).get(p['id'], {})
        merged.append({
            'id': p['id'],
            'name': cfg.get('display_name') or p['name'],
            'display_name': cfg.get('display_name') or p['name'],
            'kind': p['kind'],
            'enabled': cfg.get('enabled', True),
            'model_count': p['model_count'],
            'total_models': p['model_count'],
            'models': p['models'],
            'categories': p.get('categories', {}),
            'base_url': cfg.get('base_url') or 'Hermes gateway',
            'logo': _logo_for(p['id']),
            'status': 'Live',
            'source': 'gateway',
        })

    known = {p['id'] for p in merged}
    for pid, cfg in (config_provider_map() or {}).items():
        if pid in known:
            continue
        # Some config providers are fronted by a different gateway prefix.
        # Map the brand to the prefixes that actually serve it so the card
        # shows real model counts instead of a misleading 0.
        entry = _PROVIDER_ALIASES.get(pid)
        aliases = entry[0] if entry else []
        borrowed = [p for p in merged if p['id'] in aliases]
        alias_models = _alias_models(pid, merged)
        n_models = len(alias_models) or sum(p['model_count'] for p in borrowed)
        merged.append({
            'id': pid,
            'name': cfg.get('display_name') or pid.title(),
            'display_name': cfg.get('display_name') or pid.title(),
            'kind': 'router' if len({m.get('vendor', '') for m in alias_models
                                     if m.get('vendor')}) > 3 else 'direct',
            'enabled': cfg.get('enabled', True),
            'model_count': n_models,
            'total_models': n_models,
            # Surface the real models behind the alias, otherwise the detail
            # view opens on an empty list while the card claims 65 models.
            'models': alias_models,
            'served_by': [p['id'] for p in borrowed],
            'base_url': cfg.get('base_url') or 'official',
            'logo': _logo_for(pid),
            'status': ('Live (via %s)' % ', '.join(p['id'] for p in borrowed[:2])
                       if n_models else 'Configured'),
            'source': 'config',
        })

    # Apply the local visibility layer. Upstream has no model-level
    # enable/disable, so this is the only place hide/show can take effect.
    hidden_p = visibility.hidden_providers()
    hidden_m = visibility.hidden_models()
    if hidden_p or hidden_m:
        for card in merged:
            if card['id'] in hidden_p:
                card['hidden'] = True
            if hidden_m and card.get('models'):
                card['models'] = [m for m in card['models']
                                  if m.get('id') not in hidden_m
                                  and m.get('fullModel') not in hidden_m]
                card['model_count'] = len(card['models'])
                card['total_models'] = card['model_count']
        merged = [c for c in merged if not c.get('hidden')]

    visibility.prune({c['id'] for c in merged}
                     | visibility.hidden_providers(),
                     {m.get('id') for c in merged
                      for m in (c.get('models') or [])}
                     | visibility.hidden_models())

    return merged


_cfg_cache = {'at': 0, 'map': None}


def config_provider_map():
    """providers: {} from config.yaml, cached 60s."""
    import time as _t
    if _cfg_cache['map'] is not None and _t.time() - _cfg_cache['at'] < 60:
        return _cfg_cache['map']
    try:
        with open('/home/kira/.hermes/config.yaml', 'r') as f:
            cfg = yaml.safe_load(f) or {}
        pm = cfg.get('providers', {}) or {}
    except Exception:
        pm = {}
    _cfg_cache.update({'map': pm, 'at': _t.time()})
    return pm


class TelemetryHandler(BaseHTTPRequestHandler):
    def send_json(self, data, code=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        """Local visibility control. Upstream OmniRoute has no model-level
        enable/disable (PUT /api/models is rename-only and persists nothing),
        so hide/show is applied here and persisted to hidden_store.json."""
        
        if self.path == '/api/model/test':
            # Live Model Test Runner (9Router / OmniRouter pattern)
            try:
                n = int(self.headers.get('Content-Length') or 0)
                body = json.loads(self.rfile.read(n) or b'{}')
                model_id = body.get('model', '').strip()
                provider_id = body.get('provider', '').strip()
                kind = body.get('kind', 'text').strip()

                if not model_id:
                    return self.send_json({'ok': False, 'error': 'Missing model ID', 'latency_ms': 0}, 400)

                key = hermes_gateway._key() if hermes_gateway else ''
                gw_url = 'http://127.0.0.1:20128/v1/chat/completions'

                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {key}' if key else ''
                }

                payload = {
                    'model': model_id,
                    'messages': [{'role': 'user', 'content': 'hi'}],
                    'max_tokens': 16,
                    'stream': False
                }

                start = time.time()
                try:
                    res = requests.post(gw_url, headers=headers, json=payload, timeout=12)
                    latency = int((time.time() - start) * 1000)

                    if res.status_code == 200:
                        data = res.json()
                        choices = data.get('choices', [])
                        reply = choices[0].get('message', {}).get('content', '') if choices else ''
                        return self.send_json({
                            'ok': True,
                            'status': 200,
                            'latency_ms': latency,
                            'reply': reply[:120],
                            'error': None
                        })
                    else:
                        err_text = ''
                        try:
                            err_data = res.json()
                            err_text = err_data.get('error', {}).get('message') or str(err_data)
                        except:
                            err_text = res.text
                        return self.send_json({
                            'ok': False,
                            'status': res.status_code,
                            'latency_ms': latency,
                            'error': err_text[:200] or f'HTTP {res.status_code}'
                        })
                except requests.exceptions.Timeout:
                    latency = int((time.time() - start) * 1000)
                    return self.send_json({
                        'ok': False,
                        'status': 408,
                        'latency_ms': latency,
                        'error': 'Time Out (Model exceeded 12s response deadline)'
                    })
                except Exception as e:
                    latency = int((time.time() - start) * 1000)
                    return self.send_json({
                        'ok': False,
                        'status': 500,
                        'latency_ms': latency,
                        'error': str(e)[:180]
                    })
            except Exception as outer_err:
                return self.send_json({'ok': False, 'error': str(outer_err)}, 500)

        elif self.path == '/api/visibility':
            try:
                n = int(self.headers.get('Content-Length') or 0)
                body = json.loads(self.rfile.read(n) or b'{}')
                kind = body.get('kind')          # 'providers' | 'models'
                ident = body.get('id')
                hide = bool(body.get('hidden', True))
                if kind not in ('providers', 'models') or not ident:
                    raise ValueError('kind and id are required')
                now_hidden = visibility.set_hidden(kind, str(ident), hide)
                payload = {'ok': True, 'kind': kind, 'id': ident,
                           'hidden': now_hidden}
                code = 200
            except Exception as exc:
                payload = {'ok': False, 'error': str(exc)[:200]}
                code = 400
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode('utf-8'))
            return

        if self.path == '/api/visibility/reset':
            before = (len(visibility.hidden_providers()),
                      len(visibility.hidden_models()))
            visibility._write(visibility._blank())
            payload = {'ok': True, 'cleared': {'providers': before[0],
                                               'models': before[1]}}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode('utf-8'))
            return

        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'ok': False,
                                    'error': 'unknown route'}).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/visibility':
            return self.send_json({
                'providers': sorted(visibility.hidden_providers()),
                'models': sorted(visibility.hidden_models()),
            })
        if self.path == '/api/stats':
            data = get_telemetry()
            return self.send_json(data)
        elif self.path == '/api/providers':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            data = get_hermes_config_providers()
            body_bytes = json.dumps(data).encode('utf-8')
            self.send_header('Content-Length', str(len(body_bytes)))
            self.end_headers()
            self.wfile.write(body_bytes)
        elif self.path.startswith('/api/model/context'):
            # Dynamic Context Window Resolution via Upstream & OpenRouter / Models.dev
            import urllib.parse
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            model_id = qs.get('model', [''])[0].strip()
            provider_id = qs.get('provider', [''])[0].strip().lower()

            res_context = None
            res_output = None
            source = 'heuristic'

            if model_id:
                try:
                    clean_id = model_id.split('/')[-1].lower()
                    req = requests.get("https://openrouter.ai/api/v1/models", timeout=3)
                    if req.status_code == 200:
                        or_data = req.json().get('data', [])
                        for item in or_data:
                            i_id = item.get('id', '').lower()
                            if i_id == model_id.lower() or i_id.endswith('/' + clean_id):
                                res_context = item.get('context_length')
                                res_output = item.get('top_provider', {}).get('max_completion_tokens')
                                source = 'openrouter-verified'
                                break
                except Exception:
                    pass

            if not res_context and model_id:
                s = model_id.lower()
                if 'gemini-2' in s or 'gemini-1.5' in s or '1m' in s:
                    res_context = 1048576
                    res_output = 65536
                    source = 'official-specs'
                elif '2m' in s:
                    res_context = 2097152
                    res_output = 65536
                    source = 'official-specs'
                elif 'deepseek' in s or 'r1' in s or 'hermes' in s or 'qwen-2.5-72b' in s:
                    res_context = 200000
                    res_output = 16384
                    source = 'official-specs'
                elif 'gpt-4o' in s or 'o1' in s or 'o3' in s or 'claude-3-5' in s or 'llama-3.1' in s or 'llama-3.3' in s:
                    res_context = 128000
                    res_output = 8192
                    source = 'official-specs'
                elif 'whisper' in s or 'tts' in s or 'embed' in s:
                    res_context = 8192
                    res_output = 4096
                    source = 'official-specs'
                else:
                    res_context = 128000
                    res_output = 8192
                    source = 'default-standard'

            def fmt_ctx(num):
                if not num: return '128k'
                if num >= 1000000:
                    val = num / 1000000
                    return f"{val:.0f}M" if val.is_integer() else f"{val:.1f}M"
                if num >= 1000:
                    val = num / 1000
                    return f"{val:.0f}k" if val.is_integer() else f"{val:.1f}k"
                return str(num)

            return self.send_json({
                'ok': True,
                'model_id': model_id,
                'provider_id': provider_id,
                'raw_context': res_context,
                'formatted_context': fmt_ctx(res_context),
                'max_output_tokens': res_output or 8192,
                'source': source
            })
        elif self.path == '/api/all-providers':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data = get_all_config_providers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
        elif self.path == '/api/live-providers':
            data = get_live_providers()
            return self.send_json(data)
        elif self.path == '/api/gateway-status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data = hermes_gateway.status()
            self.wfile.write(json.dumps(data).encode('utf-8'))
        elif self.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data = model_health.summary()
            self.wfile.write(json.dumps(data).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 5174), TelemetryHandler)
    server.serve_forever()
