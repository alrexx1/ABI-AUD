import re, json

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

cargos_match = re.search(r'"cargos":(\[\{.*?\}\])(?:,"items"|,"soundCategories"|,\")', full_rsc)
if cargos_match:
    print("Found cargos array!")
    cargos = json.loads(cargos_match.group(1))
    print(f"Total cargos: {len(cargos)}")
    for c in cargos[:5]:
        print(c)
else:
    print("Cargo search with regex...")
    # let's search where cargos is defined
    idx = full_rsc.find('"cargos"')
    if idx != -1:
        print(full_rsc[idx:idx+500])
