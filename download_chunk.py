import urllib.request
import re

url = "https://abibuilder.com/_next/static/chunks/app/merchant/page-e730918df3ad7d2a.js"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode('utf-8', errors='ignore')
    with open('merchant_chunk.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Downloaded chunk, size: {len(content)} chars")
    
    # search for sound or audio or item definitions
    print("Sound matches in chunk:")
    for m in set(re.findall(r'[\'\"`/][^\'\"`]*?(?:sound|audio|\.mp3|\.ogg|\.wav)[^\'\"`]*?[\'\"`]', content, re.IGNORECASE)):
        print("  ", m[:100])
except Exception as e:
    print("Error:", e)
