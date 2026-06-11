import os
import time
import subprocess
from collections import deque
from typing import Deque, Dict

from flask import Flask, jsonify, render_template, request

from .alerting import ThresholdAlerter
from .alerts_db import AlertsDB
from .bandwidth import BandwidthMeter
from .sniffer import ScapySniffer
from .device_monitor import DeviceMonitor


def create_app():
    app = Flask(__name__, template_folder="templates")

    # Config (env override friendly)
    interface = os.environ.get("MONITOR_INTERFACE", None)
    packet_filter = os.environ.get("MONITOR_FILTER", None)
    threshold_mbps = float(os.environ.get("ALERT_THRESHOLD_MBPS", "10"))
    cooldown_seconds = int(os.environ.get("ALERT_COOLDOWN_SECONDS", "30"))
    db_path = os.environ.get("ALERTS_DB_PATH", "alerts.sqlite3")

    meter = BandwidthMeter(max_seconds=300)

    # sniffer will push bytes into meter
    sniffer = ScapySniffer(
        interface=interface,
        packet_filter=packet_filter,
        on_bytes=meter.add_bytes,
    )

    alerts_db = AlertsDB(db_path=db_path)

    # keep last few notifications in memory for UI
    recent_notifs: Deque[Dict] = deque(maxlen=50)

    # Track if background tasks started
    app.started = False

    def _on_alert(ts, bw_total, thr):
        # store to DB
        alerts_db.log_alert(
            ts=ts,
            bandwidth_mbps=bw_total,
            threshold_mbps=thr,
            interface=interface,
            note="Threshold exceeded",
        )
        recent_notifs.append(
            {
                "ts": ts,
                "bandwidth_mbps": bw_total,
                "threshold_mbps": thr,
            }
        )

    alerter = ThresholdAlerter(
        threshold_mbps=threshold_mbps,
        cooldown_seconds=cooldown_seconds,
        on_alert=_on_alert,
    )

    device_monitor = DeviceMonitor(
        db=alerts_db.db,
        interval_seconds=30,  # Check device status every 30 seconds
        on_status_update=lambda device_id, status: None
    )

    def _start_background():
        if not app.started:
            app.started = True
            try:
                meter.start()
                sniffer.start()
                alerter.start(get_bandwidth_fn=lambda: (meter.latest()[1], meter.latest()[2]))
                device_monitor.start()
            except Exception as e:
                print(f"Warning: Background tasks failed to start: {e}")
                print("API will still work with 0 bandwidth values.")

    @app.get("/")
    def index():
        _start_background()
        return render_template("index.html")

    @app.get("/api/latest")
    def api_latest():
        _start_background()
        ts, rx, tx = meter.latest()
        return jsonify({"ts": ts, "rx_mbps": rx, "tx_mbps": tx})

    @app.get("/api/timeseries")
    def api_timeseries():
        _start_background()
        seconds = int(os.environ.get("TIMESERIES_SECONDS", "60"))
        samples = meter.timeseries(seconds=seconds)
        return jsonify(
            [
                {"ts": s.ts, "rx_mbps": s.rx_mbps, "tx_mbps": s.tx_mbps}
                for s in samples
            ]
        )

    @app.get("/api/alerts")
    def api_alerts():
        _start_background()
        # combine in-memory + DB recent
        db_rows = list(alerts_db.list_recent(limit=20))
        items = []
        for (id_, ts, bw, thr, iface, note) in db_rows:
            items.append(
                {
                    "id": id_,
                    "ts": ts,
                    "bandwidth_mbps": bw,
                    "threshold_mbps": thr,
                    "interface": iface,
                    "note": note,
                }
            )
        # return latest in-memory too (dedupe loosely by ts)
        return jsonify({"items": items, "in_memory_recent": list(recent_notifs)})

    # ============ TROUBLESHOOT CRUD ENDPOINTS ============

    @app.get("/api/troubleshoot")
    def api_troubleshoot_list():
        """List all troubleshoot items"""
        _start_background()
        items = alerts_db.db.list_troubleshoot(limit=100)
        result = []
        for (ts_id, created_at, title, desc, solution, status) in items:
            result.append(
                {
                    "id": ts_id,
                    "created_at": created_at,
                    "problem_title": title,
                    "problem_description": desc,
                    "solution": solution,
                    "status": status,
                }
            )
        return jsonify({"items": result})

    @app.post("/api/troubleshoot")
    def api_troubleshoot_create():
        """Create new troubleshoot item"""
        _start_background()
        data = request.get_json()
        try:
            ts_id = alerts_db.db.add_troubleshoot(
                problem_title=data.get("problem_title", "Untitled"),
                problem_description=data.get("problem_description"),
                solution=data.get("solution"),
                status=data.get("status", "open"),
            )
            return jsonify({"success": True, "id": ts_id}), 201
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400

    @app.get("/api/troubleshoot/<int:ts_id>")
    def api_troubleshoot_get(ts_id):
        """Get single troubleshoot item"""
        _start_background()
        item = alerts_db.db.get_troubleshoot(ts_id)
        if not item:
            return jsonify({"error": "Not found"}), 404
        (id_, created_at, title, desc, solution, status) = item
        return jsonify(
            {
                "id": id_,
                "created_at": created_at,
                "problem_title": title,
                "problem_description": desc,
                "solution": solution,
                "status": status,
            }
        )

    @app.put("/api/troubleshoot/<int:ts_id>")
    def api_troubleshoot_update(ts_id):
        """Update troubleshoot item"""
        _start_background()
        data = request.get_json()
        try:
            success = alerts_db.db.update_troubleshoot(
                ts_id=ts_id,
                problem_title=data.get("problem_title"),
                problem_description=data.get("problem_description"),
                solution=data.get("solution"),
                status=data.get("status"),
            )
            if not success:
                return jsonify({"success": False, "error": "Not found"}), 404
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400

    @app.delete("/api/troubleshoot/<int:ts_id>")
    def api_troubleshoot_delete(ts_id):
        """Delete troubleshoot item"""
        _start_background()
        try:
            success = alerts_db.db.delete_troubleshoot(ts_id)
            if not success:
                return jsonify({"success": False, "error": "Not found"}), 404
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400

    # ============ DEVICE MANAGEMENT ENDPOINTS ============

    @app.get("/api/devices")
    def api_devices_list():
        """List all devices"""
        _start_background()
        items = alerts_db.db.list_devices()
        result = []
        for (dev_id, nama, lokasi, ip, mac, status, last_check, created_at) in items:
            result.append(
                {
                    "id": dev_id,
                    "nama": nama,
                    "lokasi": lokasi,
                    "ip": ip,
                    "mac": mac,
                    "status": status,
                    "last_check": last_check,
                    "created_at": created_at,
                }
            )
        return jsonify({"items": result})

    @app.get("/api/devices/summary")
    def api_devices_summary():
        """Summary + latest UP devices for realtime dashboard"""
        _start_background()
        # Load all; schema is small and avoids adding new DB query methods.
        items = alerts_db.db.list_devices()
        total = 0
        up = 0
        down = 0
        up_items = []
        for (dev_id, nama, lokasi, ip, mac, status, last_check, created_at) in items:
            total += 1
            st = (status or "unknown").upper()
            if st == "UP":
                up += 1
                up_items.append(
                    {
                        "id": dev_id,
                        "nama": nama,
                        "lokasi": lokasi,
                        "ip": ip,
                        "mac": mac,
                        "status": status,
                        "last_check": last_check,
                        "created_at": created_at,
                    }
                )
            elif st == "DOWN":
                down += 1

        # Show most recently created/checked UP devices
        up_items_sorted = sorted(
            up_items,
            key=lambda x: x.get("last_check") or x.get("created_at") or 0,
            reverse=True,
        )
        limit = int(os.environ.get("UP_DEVICES_LIMIT", "20"))
        return jsonify({"total": total, "up": up, "down": down, "up_items": up_items_sorted[:limit]})


    @app.post("/api/devices")
    def api_devices_create():
        """Create new device"""
        _start_background()
        data = request.get_json()
        try:
            dev_id = alerts_db.db.add_device(
                nama=data.get("nama", "Unnamed"),
                ip=data.get("ip", ""),
                lokasi=data.get("lokasi"),
                mac=data.get("mac"),
                status="unknown",
            )
            if dev_id == -1:
                return jsonify({"success": False, "error": "IP sudah ada"}), 400
            return jsonify({"success": True, "id": dev_id}), 201
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400

    @app.get("/api/devices/<int:device_id>")
    def api_devices_get(device_id):
        """Get single device"""
        _start_background()
        item = alerts_db.db.get_device(device_id)
        if not item:
            return jsonify({"error": "Not found"}), 404
        (dev_id, nama, lokasi, ip, mac, status, last_check, created_at) = item
        return jsonify(
            {
                "id": dev_id,
                "nama": nama,
                "lokasi": lokasi,
                "ip": ip,
                "mac": mac,
                "status": status,
                "last_check": last_check,
                "created_at": created_at,
            }
        )

    @app.put("/api/devices/<int:device_id>")
    def api_devices_update(device_id):
        """Update device"""
        _start_background()
        data = request.get_json()
        try:
            success = alerts_db.db.update_device(
                device_id=device_id,
                nama=data.get("nama"),
                lokasi=data.get("lokasi"),
                ip=data.get("ip"),
                mac=data.get("mac"),
                status=data.get("status"),
            )
            if not success:
                return jsonify({"success": False, "error": "Not found"}), 404
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400

    @app.delete("/api/devices/<int:device_id>")
    def api_devices_delete(device_id):
        """Delete device"""
        _start_background()
        try:
            success = alerts_db.db.delete_device(device_id)
            if not success:
                return jsonify({"success": False, "error": "Not found"}), 404
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400

    # ============ DIAGNOSTIC ENDPOINTS (PING & TRACERT) ============

    def _run_ping(ip_address: str, count: int = 4) -> Dict:
        """Run ping command and return results"""
        try:
            if os.name == 'nt':  # Windows
                cmd = f'ping -n {count} {ip_address}'
            else:  # Linux/Mac
                cmd = f'ping -c {count} {ip_address}'
            
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            output = result.stdout + result.stderr
            success = result.returncode == 0
            
            # Parse output for stats
            stats = {"packets_sent": count, "packets_received": 0, "packet_loss": 100, "rtt_min": None, "rtt_avg": None, "rtt_max": None}
            
            if success and "packets received" in output.lower():
                # Simple parsing
                lines = output.split('\n')
                for line in lines:
                    if 'statistics' in line.lower() or 'packets' in line.lower():
                        # Try to extract packet info
                        if 'received' in line.lower():
                            try:
                                parts = line.split()
                                for i, part in enumerate(parts):
                                    if 'received' in part.lower() and i > 0:
                                        stats["packets_received"] = int(parts[i-1])
                                        break
                            except:
                                pass
                
                if stats["packets_received"] > 0:
                    stats["packet_loss"] = max(0, 100 * (count - stats["packets_received"]) // count)
            
            return {
                "success": success,
                "ip": ip_address,
                "output": output,
                "stats": stats
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "ip": ip_address,
                "output": "Timeout",
                "error": "Ping timeout exceeded"
            }
        except Exception as e:
            return {
                "success": False,
                "ip": ip_address,
                "output": "",
                "error": str(e)
            }

    def _run_tracert(ip_address: str) -> Dict:
        """Run tracert/traceroute command and return results"""
        try:
            if os.name == 'nt':  # Windows
                cmd = f'tracert -w 1000 {ip_address}'
            else:  # Linux/Mac
                cmd = f'traceroute {ip_address}'
            
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            output = result.stdout + result.stderr
            
            return {
                "success": result.returncode == 0 or len(output) > 0,
                "ip": ip_address,
                "output": output,
                "lines": output.split('\n')[:20]  # First 20 hops
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "ip": ip_address,
                "output": "Timeout",
                "error": "Tracert timeout exceeded"
            }
        except Exception as e:
            return {
                "success": False,
                "ip": ip_address,
                "output": "",
                "error": str(e)
            }

    @app.post("/api/devices/ping/<path:ip_address>")
    def api_devices_ping(ip_address):
        """Ping a device IP"""
        _start_background()
        try:
            result = _run_ping(ip_address)
            # Update device status if exists
            data = request.get_json() or {}
            device_id = data.get("device_id")
            if device_id:
                new_status = "UP" if result.get("success") else "DOWN"
                alerts_db.db.update_device_status(device_id, new_status)
            return jsonify(result)
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400

    @app.post("/api/devices/tracert/<path:ip_address>")
    def api_devices_tracert(ip_address):
        """Tracert to a device IP"""
        _start_background()
        try:
            result = _run_tracert(ip_address)
            return jsonify(result)
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400

    return app


if __name__ == "__main__":
    app = create_app()
    # host all for LAN if needed
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=False)

