import urllib.request
import json

response = urllib.request.urlopen('http://127.0.0.1:5000/api/devices')
data = json.loads(response.read())
for d in data['items']:
    print(f"  {d['nama']}: {d['ip']} (Status: {d['status']})")
