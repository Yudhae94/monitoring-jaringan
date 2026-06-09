import urllib.request
import urllib.parse
import json

devices = [
    {"nama": "PUSKESMAS KEDUNGWARINGIN", "ip": "192.168.1.100", "lokasi": "Kedungwaringin", "mac": ""},
    {"nama": "PUSKESMAS KARANGSAMBUNG", "ip": "192.168.1.101", "lokasi": "Kedungwaringin", "mac": ""},
    {"nama": "SMPN 1 KEDUNGWARINGIN", "ip": "192.168.1.102", "lokasi": "Kedungwaringin", "mac": ""},
    {"nama": "PKM KARANGHARJA", "ip": "192.168.1.103", "lokasi": "Pabayuran", "mac": ""},
    {"nama": "PKM PEBAYURAN", "ip": "192.168.1.104", "lokasi": "Pabayuran", "mac": ""},
    {"nama": "SMPN 1 PEBAYURAN", "ip": "192.168.1.105", "lokasi": "Pabayuran", "mac": ""},
    {"nama": "SMPN 2 PEBAYURAN", "ip": "192.168.1.106", "lokasi": "Pabayuran", "mac": ""},
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
