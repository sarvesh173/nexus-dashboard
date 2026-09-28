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
                    
                    # Classify category
                    mid_lower = mid.lower()
                    if any(k in mid_lower for k in ['embed', 'retriever', 'clip']):
                        cat = 'embedding'
                    elif any(k in mid_lower for k in ['tts', 'voice', 'speech', 'audio', 'sound', 'bark']):
                        cat = 'tts'
                    elif any(k in mid_lower for k in ['stt', 'whisper', 'transcribe', 'asr', 'riva-translate', 'translate']):
                        cat = 'stt'
                    elif any(k in mid_lower for k in ['diffusion', 'image', 'video', 'cosmos', 'sdxl', 'flux', 'synthetic-video', 'fuyu', 'kosmos', 'neva', 'vila']):
                        cat = 'image'
                    elif any(k in mid_lower for k in ['reason', 'guard', 'reward', 'safety', 'parse', 'calibration', 'dbrx']):
                        cat = 'decision'
                    else:
                        cat = 'text' # LLM

                    # Check configured status
                    is_active = mid in configured_models or len(configured_models) == 0

                    models_list.append({
                        'id': mid,
                        'name': mname,
                        'category': cat,
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
                        'description': f'Official NVIDIA NIM accelerated model: {mid}'
                    })
            else:
                api_status = f'HTTP {resp.status_code}'
        except Exception as e:
            api_status = 'Unavailable'
            # Fallback to configured models in config.yaml
            for mid in configured_models:
                models_list.append({
                    'id': mid,
                    'name': mid.split('/')[-1].title(),
                    'category': 'text',
                    'provider': 'NVIDIA NIM',
                    'tier': 'free',
                    'input_pricing': '$0.00 / Free',
                    'output_pricing': '$0.00 / Free',
                    'rate_limit': '40 RPM',
                    'status': 'Configured',
                    'configured_in_hermes': True,
                    'context': {'original': '128k', 'system': 'Hermes Link'},
                    'description': f'Configured model: {mid}'
                })

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
            'models': models_list,
            'categories': {
                'text': len([m for m in models_list if m['category'] == 'text']),
                'image': len([m for m in models_list if m['category'] == 'image']),
                'video': len([m for m in models_list if m['category'] == 'video']),
                'tts': len([m for m in models_list if m['category'] == 'tts']),
                'stt': len([m for m in models_list if m['category'] == 'stt']),
                'embedding': len([m for m in models_list if m['category'] == 'embedding']),
                'decision': len([m for m in models_list if m['category'] == 'decision'])
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
