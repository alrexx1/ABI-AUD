import re, json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('merchant.html', 'r', encoding='utf-8') as f:
    html = f.read()

rsc_parts = re.findall(r'self\.__next_f\.push\(\[\d+,"(.*?)"\]\)', html, re.DOTALL)
full_rsc = ""
for part in rsc_parts:
    try:
        unescaped = part.encode('utf-8').decode('unicode_escape')
        full_rsc += unescaped
    except:
        full_rsc += part.replace(r'\"', '"').replace(r'\\', '\\')

# Find the items array
items_match = re.search(r'"items":(\[\{.*?\}\])(?:,"cargos"|,"soundCategories"|,"[a-zA-Z]+":|,\")', full_rsc)
if not items_match:
    # try another regex
    items_start = full_rsc.find('"items":[{"')
    if items_start != -1:
        # find matching bracket
        depth = 0
        start_idx = items_start + len('"items":')
        end_idx = start_idx
        for i in range(start_idx, len(full_rsc)):
            if full_rsc[i] == '[':
                depth += 1
            elif full_rsc[i] == ']':
                depth -= 1
                if depth == 0:
                    end_idx = i + 1
                    break
        items_json_str = full_rsc[start_idx:end_idx]
        items_data = json.loads(items_json_str)
    else:
        print("Could not find items array")
        sys.exit(1)
else:
    items_data = json.loads(items_match.group(1))

print(f"Total items extracted: {len(items_data)}")

# Save to items.json
with open('items.json', 'w', encoding='utf-8') as f:
    json.dump(items_data, f, ensure_ascii=False, indent=2)

print("Saved items.json!")

# Let's see what other keys are in the same object that has "items"
# Let's find what is around items in full_rsc
items_pos = full_rsc.find('"items":')
surrounding = full_rsc[max(0, items_pos - 1000):items_pos]
print("Surrounding before items:")
print(surrounding[-300:])

surrounding_after = full_rsc[end_idx if 'end_idx' in locals() else items_pos: (end_idx if 'end_idx' in locals() else items_pos) + 2000]
print("Surrounding after items:")
print(surrounding_after[:500])
