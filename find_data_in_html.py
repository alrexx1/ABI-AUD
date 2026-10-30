import re, json

with open('merchant.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Search for dropSound or pickupSound or soundId in merchant.html
matches = list(re.finditer(r'(?:dropSound|pickupSound|soundId)', html))
print(f"Total occurrences in HTML: {len(matches)}")
for m in matches[:10]:
    start = max(0, m.start() - 100)
    end = min(len(html), m.start() + 200)
    print("--- MATCH ---")
    print(html[start:end])
