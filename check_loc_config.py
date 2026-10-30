import urllib.request
import re
import json

url = 'https://abi-tracker.azurewebsites.net/GameInfo/Merchant'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

m = re.search(r'id="abi-config-localization"[^>]*>(.*?)</script>', html, re.DOTALL)
if m:
    cfg = json.loads(m.group(1))
    print(json.dumps(cfg, indent=2))
