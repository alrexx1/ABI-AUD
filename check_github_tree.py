import urllib.request
import json

url = "https://api.github.com/repos/hexaov91/abi-assets/git/trees/main?recursive=1"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        tree = data.get('tree', [])
        print(f"Total files in hexaov91/abi-assets: {len(tree)}")
        audio_files = [t['path'] for t in tree if 'audio' in t['path']]
        print(f"Audio files count: {len(audio_files)}")
        for af in audio_files[:30]:
            print(" ", af)
except Exception as e:
    print("GitHub API error:", e)
