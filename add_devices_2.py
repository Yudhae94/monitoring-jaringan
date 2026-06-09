import urllib.request
import urllib.parse
import json

devices = [
    {"nama": "KEC KEDUNGWARINGIN", "ip": "192.168.1.107", "lokasi": "Kedungwaringin", "mac": ""},
    {"nama": "PKM KARANGREJA", "ip": "192.168.1.108", "lokasi": "Pebayuran", "mac": ""},
]

api_url = "http://127.0.0.1:5000/api/devices"
for device in devices:
    try:
        data = json.dumps(device).encode('utf-8')
        req = urllib.request.Request(api_url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"✅ {device['nama']} - Added (ID: {result.get('id')})")
    except Exception as e:
        print(f"❌ {device['nama']} - Exception: {str(e)}")

print("\n📋 All devices in database:")
try:
    with urllib.request.urlopen(api_url) as response:
        data = json.loads(response.read().decode('utf-8'))
        all_devices = data.get('items', [])
        for dev in all_devices:
            print(f"  - {dev['nama']} ({dev['ip']}) @ {dev['lokasi']}")
except Exception as e:
    print(f"Error getting devices: {str(e)}")
