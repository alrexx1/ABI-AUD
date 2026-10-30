import json
import urllib.request
import os

with open('merchant_full_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sounds = data['sounds']
os.makedirs('audio', exist_ok=True)
sample_drop = sounds[0]['drop']
sample_pickup = sounds[0]['pickup']

base_url = "https://abibuilder.com/audio/merchant/"

for s_name in [sample_drop, sample_pickup]:
    url = f"{base_url}{s_name}.ogg"
    dest = f"audio/{s_name}.ogg"
    print(f"Testing URL: {url}")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
            with open(dest, 'wb') as f_out:
                f_out.write(content)
            print(f"Success! Downloaded {s_name}.ogg ({len(content)} bytes)")
    except Exception as e:
        print(f"Failed {s_name}: {e}")
