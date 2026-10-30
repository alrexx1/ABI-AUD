import re
import json

with open('merchant.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's extract all json blobs or find the data structure
# In Next.js RSC, it's often in self.__next_f.push([1, "..."])
# Let's search for "items":\[{ or similar

# Find all occurrences of items array
items = []
cargos = []

# Let's search with regex for json objects having "pickupSound" and "dropSound"
pattern = r'\{[^{}]*?"name":"([^"]+)"[^{}]*?"pickupSound":"([^"]+)"[^{}]*?"dropSound":"([^"]+)"[^{}]*?\}'

# Or let's reconstruct the Next.js chunks or extract the JSON payload
# Let's write a parser for the RSC payload
rsc_parts = re.findall(r'self\.__next_f\.push\(\[\d+,"(.*?)"\]\)', html, re.DOTALL)
full_rsc = ""
for part in rsc_parts:
    # unescape javascript string
    try:
        unescaped = part.encode('utf-8').decode('unicode_escape')
        full_rsc += unescaped
    except:
        full_rsc += part.replace(r'\"', '"').replace(r'\\', '\\')

print(f"Reconstructed RSC length: {len(full_rsc)}")

# Let's look for "items" in full_rsc
items_match = re.search(r'"items":(\[\{.*?\}\])(?:,"cargos"|,"soundCategories"|,\")', full_rsc)
if items_match:
    print("Found items array directly!")
    try:
        items_data = json.loads(items_match.group(1))
        print(f"Parsed {len(items_data)} items!")
    except Exception as e:
        print("Json load error for items:", e)
else:
    print("Could not find exact items match with simple regex, trying deeper search...")
    # Find all item-like objects
    item_objs = re.findall(r'(\{"iconId":\d+,.*?"dropSound":"[^"]+"\})', full_rsc)
    print(f"Found {len(item_objs)} item candidate objects")
    items_data = []
    for io in item_objs:
        try:
            items_data.append(json.loads(io))
        except:
            pass
    print(f"Successfully parsed {len(items_data)} item objects")

# Check rarities and red items
rarities = set()
for it in items_data:
    rarities.add(it.get('rarity'))
print("Rarities present:", sorted(list(rarities)))

# Let's find red items (rarity 6 or high value?)
red_items = [it for it in items_data if it.get('rarity') == 6]
print(f"Total rarity 6 items: {len(red_items)}")
for r in red_items[:10]:
    print(f"  {r.get('name')} | Rarity: {r.get('rarity')} | Price: {r.get('referencePrice'):,} | Sound: {r.get('dropSound')} (ID: {r.get('soundId')})")

# Let's find all unique sounds
sounds = {}
for it in items_data:
    sid = it.get('soundId')
    dsound = it.get('dropSound')
    psound = it.get('pickupSound')
    if sid not in sounds:
        sounds[sid] = {'drop': set(), 'pickup': set(), 'items': []}
    sounds[sid]['drop'].add(dsound)
    sounds[sid]['pickup'].add(psound)
    sounds[sid]['items'].append(it['name'])

print(f"\nTotal unique soundIds: {len(sounds)}")
for sid in sorted(sounds.keys()):
    print(f"Sound ID {sid}: drop={list(sounds[sid]['drop'])} (items count: {len(sounds[sid]['items'])})")
