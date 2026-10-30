import json
import urllib.request
import os
import time

with open('merchant_full_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sounds = data['sounds']
os.makedirs('audio', exist_ok=True)

all_files = set()
for s in sounds:
    if s.get('drop'):
        all_files.add(s['drop'])
    if s.get('pickup'):
        all_files.add(s['pickup'])

print(f"Total unique sound audio files to download: {len(all_files)}")

base_url = "https://abibuilder.com/audio/merchant/"
downloaded = 0
failed = 0

for idx, name in enumerate(sorted(all_files)):
    dest = os.path.join('audio', f"{name}.ogg")
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        downloaded += 1
        continue
    url = f"{base_url}{name}.ogg"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read()
            with open(dest, 'wb') as f_out:
                f_out.write(content)
            downloaded += 1
            if (idx + 1) % 10 == 0:
                print(f"[{idx+1}/{len(all_files)}] Downloaded {name}.ogg")
    except Exception as e:
        print(f"Failed {name}: {e}")
        failed += 1
    time.sleep(0.05)

print(f"Completed! Downloaded: {downloaded}, Failed: {failed}")
