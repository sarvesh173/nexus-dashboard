#!/usr/bin/env python3
import time
import urllib.request
import subprocess
import os
import sys
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

DASHBOARD_URL = "http://127.0.0.1:5173/"
TELEMETRY_URL = "http://127.0.0.1:5174/api/health"
LOG_FILE = "/home/kira/nexus-dashboard/cache/watchdog.log"
STATUS_FILE = "/home/kira/nexus-dashboard/cache/watchdog_agents_status.json"
WEBHOOK_PORT = 5178

os.makedirs("/home/kira/nexus-dashboard/cache", exist_ok=True)

agents_state = {}
lock = threading.Lock()

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [WATCHDOG] {msg}\n"
    print(line, end="", flush=True)
    with open(LOG_FILE, "a") as f:
        f.write(line)

def persist_agents_state():
    with lock:
        try:
            with open(STATUS_FILE, "w") as f:
                json.dump(agents_state, f, indent=2)
        except Exception as e:
            log(f"Error persisting agent state: {e}")

class WatchdogWebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/webhook/agent":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            try:
                data = json.loads(body)
                agent_id = data.get("agent_id", "unknown")
                status = data.get("status", "progress")
                step = data.get("step", "")
                details = data.get("details", "")

                ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                with lock:
                    agents_state[agent_id] = {
                        "agent_id": agent_id,
                        "status": status,
                        "step": step,
                        "details": details,
                        "updated_at": ts
                    }
                persist_agents_state()
                log(f"[WEBHOOK] Agent '{agent_id}' -> status: {status} | step: {step}")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status": "recorded"}')
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path == "/webhook/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            with lock:
                payload = json.dumps({"watchdog": "online", "agents": agents_state})
            self.wfile.write(payload.encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass

def run_webhook_server():
    server = HTTPServer(("0.0.0.0", WEBHOOK_PORT), WatchdogWebhookHandler)
    log(f"Watchdog Webhook Listener started on port {WEBHOOK_PORT}")
    server.serve_forever()

def check_url(url, timeout=3):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "NexusWatchdog/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False

def restart_service(service_name):
    log(f"ALERT: {service_name} unhealthy or unresponsive! Triggering restart...")
    res = subprocess.run(["systemctl", "--user", "restart", service_name], capture_output=True, text=True)
    if res.returncode == 0:
        log(f"SUCCESS: {service_name} restarted successfully.")
    else:
        log(f"ERROR: Failed to restart {service_name}: {res.stderr}")

def main():
    log("Starting Nexus Dashboard & Telemetry Watchdog Service with Webhook Receiver...")
    threading.Thread(target=run_webhook_server, daemon=True).start()

    fail_count_dashboard = 0
    fail_count_telemetry = 0

    while True:
        try:
            # Check frontend
            dash_ok = check_url(DASHBOARD_URL)
            if dash_ok:
                fail_count_dashboard = 0
            else:
                fail_count_dashboard += 1
                log(f"Dashboard probe failed (consecutive failures: {fail_count_dashboard})")
                if fail_count_dashboard >= 2:
                    restart_service("nexus-dashboard.service")
                    fail_count_dashboard = 0
                    time.sleep(3)

            # Check backend telemetry
            telem_ok = check_url(TELEMETRY_URL)
            if telem_ok:
                fail_count_telemetry = 0
            else:
                fail_count_telemetry += 1
                log(f"Telemetry probe failed (consecutive failures: {fail_count_telemetry})")
                if fail_count_telemetry >= 2:
                    restart_service("nexus-telemetry.service")
                    fail_count_telemetry = 0
                    time.sleep(3)

        except Exception as e:
            log(f"Watchdog internal loop error: {e}")

        time.sleep(5)

if __name__ == "__main__":
    main()
