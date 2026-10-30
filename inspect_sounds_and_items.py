import json

with open('catalog_unpacked.json', 'r', encoding='utf-8') as f:
    cat = json.load(f)

with open('localization_en.json', 'r', encoding='utf-8') as f:
    loc = json.load(f)

names = loc.get("UACommonItemTable", {}).get("Name", {})
sounds = {s["id"]: s for s in cat.get("sounds", [])}

items = cat.get("items", [])
print(f"Catalog items count: {len(items)}")

# Count by rarity or item
print("\nSound table (38 sounds):")
for sid in sorted(sounds.keys()):
    s = sounds[sid]
    # find items with this sound
    s_items = [names.get(str(it["id"]), str(it["id"])) for it in items if it.get("soundId") == sid]
    print(f"Sound {sid:2}: drop={s['drop']:30} pickup={s['pickup']:30} -> ({len(s_items)} items) e.g. {s_items[:3]}")
