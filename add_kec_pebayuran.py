import urllib.request
import json

devices = [
    {"nama": "KEC PEBAYURAN", "ip": "192.168.1.109", "lokasi": "Pebayuran", "mac": ""},
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

print("\n📋 Total devices:")
try:
    with urllib.request.urlopen(api_url) as response:
        data = json.loads(response.read().decode('utf-8'))
        all_devices = data.get('items', [])
        print(f"Total: {len(all_devices)} devices")
except Exception as e:
    print(f"Error: {e}")
