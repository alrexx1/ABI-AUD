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

# Find "data":{"version":
data_start = full_rsc.find('{"data":{"version":')
if data_start == -1:
    data_start = full_rsc.find('{"version":"1.0.0.151.10"')
    
print("Data start index:", data_start)

# Bracket matching to extract the full JSON object
depth = 0
start_idx = data_start
end_idx = start_idx
for i in range(start_idx, len(full_rsc)):
    if full_rsc[i] == '{':
        depth += 1
    elif full_rsc[i] == '}':
        depth -= 1
        if depth == 0:
            end_idx = i + 1
            break

json_str = full_rsc[start_idx:end_idx]
print(f"Extracted json string length: {len(json_str)}")
parsed = json.loads(json_str)

if 'data' in parsed:
    full_data = parsed['data']
else:
    full_data = parsed

with open('merchant_full_data.json', 'w', encoding='utf-8') as f:
    json.dump(full_data, f, ensure_ascii=False, indent=2)

print("Saved merchant_full_data.json!")
print("Keys in full_data:", list(full_data.keys()))
for k in full_data.keys():
    if isinstance(full_data[k], list):
        print(f"  {k}: {len(full_data[k])} elements")
    elif isinstance(full_data[k], dict):
        print(f"  {k}: {list(full_data[k].keys())}")
    else:
        print(f"  {k}: {full_data[k]}")
