import threading
import time
import subprocess
import os
from typing import Callable


class DeviceMonitor(threading.Thread):
    """Background thread that periodically pings all devices and updates their status"""
    
    def __init__(self, db, interval_seconds=30, on_status_update=None):
        """
        Args:
            db: AlertsDB instance (has db.list_devices(), db.update_device_status())
            interval_seconds: How often to check device status (default 30 seconds)
            on_status_update: Optional callback function for status updates
        """
        super().__init__(daemon=True)
        self.db = db
        self.interval = interval_seconds
        self.on_status_update = on_status_update or (lambda device_id, status: None)
        self._stop_event = threading.Event()
    
    def stop(self):
        """Signal the monitor to stop"""
        self._stop_event.set()
    
    def run(self):
        """Main monitoring loop"""
        print(f"[DeviceMonitor] Started with {self.interval}s interval")
        
        while not self._stop_event.is_set():
            try:
                # Get all devices
                devices = self.db.list_devices()
                
                for device in devices:
                    if self._stop_event.is_set():
                        break
                    
                    device_id, nama, lokasi, ip, mac, status, last_check, created_at = device
                    
                    # Ping the device
                    new_status = self._ping_device(ip)
                    
                    # Update status if changed
                    if new_status != status:
                        try:
                            self.db.update_device_status(device_id, new_status)
                            print(f"[DeviceMonitor] {nama} ({ip}) -> {new_status}")
                            self.on_status_update(device_id, new_status)
                        except Exception as e:
                            print(f"[DeviceMonitor] Error updating {nama}: {e}")
                
                # Wait before next check
                self._stop_event.wait(self.interval)
            
            except Exception as e:
                print(f"[DeviceMonitor] Error in monitoring loop: {e}")
                self._stop_event.wait(5)  # Wait a bit before retry
    
    def _ping_device(self, ip_address: str) -> str:
        """
        Ping a device and return UP/DOWN status
        Returns: "UP" or "DOWN"
        """
        try:
            if os.name == 'nt':  # Windows
                cmd = f'ping -n 1 -w 1000 {ip_address}'
            else:  # Linux/Mac
                cmd = f'ping -c 1 -W 1 {ip_address}'
            
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            return "UP" if result.returncode == 0 else "DOWN"
        
        except subprocess.TimeoutExpired:
            return "DOWN"
        except Exception as e:
            print(f"[DeviceMonitor] Ping error for {ip_address}: {e}")
            return "DOWN"
