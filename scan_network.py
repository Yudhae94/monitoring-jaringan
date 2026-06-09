import subprocess
import urllib.request
import json
import re

# Scan network 192.168.1.0/24 for active devices
print("[*] Scanning network 192.168.1.0/24 for active devices...")
print("[*] This may take a minute...\n")

active_ips = []

# Ping IPs 1-254
for i in range(1, 255):
    ip = f"192.168.1.{i}"
    try:
        result = subprocess.run(
            f'ping -n 1 -w 500 {ip}',
            shell=True,
            capture_output=True,
            text=True,
            timeout=2
        )
        if result.returncode == 0:
            active_ips.append(ip)
            print(f"✅ Found: {ip}")
    except:
        pass

print(f"\n[+] Found {len(active_ips)} active devices:")
for ip in active_ips:
    print(f"  - {ip}")

# Get device list from API
api_url = "http://127.0.0.1:5000/api/devices"
try:
    with urllib.request.urlopen(api_url) as response:
        data = json.loads(response.read().decode('utf-8'))
        devices = data.get('items', [])
        
        print(f"\n[*] Updating database with active IPs...")
        updated_count = 0
        
        for i, device in enumerate(devices):
            device_id = device['id']
            old_ip = device['ip']
            
            # Find active IP and assign to device
            if i < len(active_ips):
                new_ip = active_ips[i]
                
                # Update device with new IP
                update_data = {
                    "nama": device['nama'],
                    "ip": new_ip,
                    "lokasi": device['lokasi'],
                    "mac": device['mac'],
                    "status": "unknown"
                }
                
                try:
                    update_json = json.dumps(update_data).encode('utf-8')
                    req = urllib.request.Request(
                        f"{api_url}/{device_id}",
                        data=update_json,
                        headers={'Content-Type': 'application/json'},
                        method='PUT'
                    )
                    with urllib.request.urlopen(req) as resp:
                        result = json.loads(resp.read().decode('utf-8'))
                        if result.get('success'):
                            print(f"✅ {device['nama']}: {old_ip} → {new_ip}")
                            updated_count += 1
                except Exception as e:
                    print(f"❌ Error updating {device['nama']}: {e}")
        
        print(f"\n[+] Updated {updated_count} devices")
        
        # Show final device list
        print(f"\n[📋] Final device list:")
        with urllib.request.urlopen(api_url) as response:
            data = json.loads(response.read().decode('utf-8'))
            for dev in data.get('items', []):
                print(f"  - {dev['nama']}: {dev['ip']} @ {dev['lokasi']}")

except Exception as e:
    print(f"Error: {e}")
