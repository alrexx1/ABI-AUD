import urllib.request
import re

url = 'https://abi-tracker.azurewebsites.net/GameInfo/Merchant'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

scripts = re.findall(r'<script[^>]+src="([^"]+)"', html)
print('Script URLs:')
for s in scripts:
    print(' ', s)
