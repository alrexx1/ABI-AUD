import urllib.request
import json
import os

with open('list_all_reds.py') as f:
    pass

# Load our reds
import subprocess
output = subprocess.check_output(['python', 'list_all_reds.py']).decode('utf-8')
print("Reds loaded.")

with open('items_index_unpacked.json', 'r', encoding='utf-8') as f:
    items_index = json.load(f)
with open('localization_en.json', 'r', encoding='utf-8') as f:
    loc = json.load(f)

names = loc.get("UACommonItemTable", {}).get("Name", {})
items = items_index.get("items", {})

# Test fetching icons for top 10 reds
red_items = [it for it in items.values() if it.get('rarity') == 6]
print(f"Testing icons for {len(red_items)} red items:")
for r in red_items[:10]:
    icon_id = r.get('iconId')
    url = f"https://hexaov91.github.io/abi-assets/image/Normal/{icon_id}.png"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"Icon {icon_id} status: {resp.status}, size: {len(resp.read())} bytes")
    except Exception as e:
        print(f"Icon {icon_id} failed: {e}")
