import urllib.request

url = 'https://hexaov91.github.io/abi-assets/_abi/releases/by-sha256/o0y4sXq5m7AZQ7fAPYqnhnEfMc6bWG2rhoCeg371OTU/js/Shared/static-data.js'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    code = resp.read().decode('utf-8', errors='ignore')

with open('static-data.js', 'w', encoding='utf-8') as f:
    f.write(code)

print('Saved static-data.js, length:', len(code))
print(code[:2000])
