with open('merchant_chunk.js', 'r', encoding='utf-8') as f:
    code = f.read()

import re

# Find occurrences of /audio/merchant/
matches = [m.start() for m in re.finditer(r'/audio/merchant/', code)]
for idx in matches:
    print("--- SNIPPET ---")
    start = max(0, idx - 150)
    end = min(len(code), idx + 250)
    print(code[start:end])
