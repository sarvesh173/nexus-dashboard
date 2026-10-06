#!/usr/bin/env python3
import time
import urllib.request
import subprocess
import os
import sys
from datetime import datetime

DASHBOARD_URL = "http://127.0.0.1:5173/"
TELEMETRY_URL = "http://127.0.0.1:5174/api/health"
LOG_FILE = "/home/kira/nexus-dashboard/cache/watchdog.log"

os.makedirs("/home/kira/nexus-dashboard/cache", exist_ok=True)

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [WATCHDOG] {msg}\n"
    print(line, end="", flush=True)
    with open(LOG_FILE, "a") as f:
        f.write(line)

def check_url(url, timeout=3):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "NexusWatchdog/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception as e:
        return False

def restart_service(service_name):
    log(f"ALERT: {service_name} unhealthy or unresponsive! Triggering restart...")
    res = subprocess.run(["systemctl", "--user", "restart", service_name], capture_output=True, text=True)
    if res.returncode == 0:
        log(f"SUCCESS: {service_name} restarted successfully.")
    else:
        log(f"ERROR: Failed to restart {service_name}: {res.stderr}")

def main():
    log("Starting Nexus Dashboard & Telemetry Watchdog Service...")
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
