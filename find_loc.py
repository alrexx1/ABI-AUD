import urllib.request
import re

url = 'https://hexaov91.github.io/abi-assets/_abi/releases/by-sha256/zVzI-HL2dOxV-tprOXautXMNWEmK6oXk2ms64mgr9qY/js/game-localization.js'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    code = resp.read().decode('utf-8', errors='ignore')

with open('game-localization.js', 'w', encoding='utf-8') as f:
    f.write(code)

matches = re.findall(r'https?://[^\s"\']+|/data/[^\s"\']+', code)
print('URLs in game-localization.js:', matches)

# Find all occurrences of loadJson or fetch
for m in re.finditer(r'loadJson', code):
    idx = m.start()
    print('loadJson call snippet:', code[max(0, idx-60):min(len(code), idx+150)])
