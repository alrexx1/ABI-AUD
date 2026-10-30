with open('merchant.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
idx = html.find('"items":[')
print("Position of items:", idx)
start = max(0, idx - 500)
print("Before items:", html[start:idx])

# Find what comes after items
# let's find the closing bracket of items
# in Next.js stream
end_of_items = html.find('}]', idx)
print("After items first end:", html[end_of_items:end_of_items+500])
