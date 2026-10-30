import urllib.request
import json

url = "https://hexaov91.github.io/abi-assets/localization/game/en.json?v=CKlrn_q8JN5yzuPCdHSrVhb9ykRF6UjfkXv1Mdrpy4Y"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
print("Downloading en.json...")
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

with open('localization_en.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Saved localization_en.json")
item_names = data.get("UACommonItemTable", {}).get("Name", {})
print(f"Total localized item names: {len(item_names)}")

# Load our unpacked items
with open('items_index_unpacked.json', 'r', encoding='utf-8') as f:
    items_index = json.load(f)

with open('catalog_unpacked.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

catalog_items = {str(item["id"]): item for item in catalog.get("items", [])}
sounds = {s["id"]: s for s in catalog.get("sounds", [])}

items = items_index.get("items", {})

print("\n=== ALL 45 TIER 6 (RED) ITEMS WITH ENGLISH NAMES ===")
reds = []
for i_id, info in items.items():
    if info.get("rarity") == 6:
        name = item_names.get(str(i_id), "UNKNOWN")
        cat_item = catalog_items.get(str(i_id), {})
        sound_id = cat_item.get("soundId") if cat_item else info.get("soundId")
        sound_info = sounds.get(sound_id, {}) if sound_id else {}
        price = cat_item.get("contactPrice") or info.get("contactPrice") or cat_item.get("price") or info.get("price")
        size = info.get("size")
        icon_id = info.get("iconId")
        reds.append({
            "id": i_id,
            "name": name,
            "soundId": sound_id,
            "drop": sound_info.get("drop"),
            "pickup": sound_info.get("pickup"),
            "price": price,
            "size": size,
            "iconId": icon_id,
            "in_catalog": str(i_id) in catalog_items
        })

reds.sort(key=lambda x: (-(x["price"] or 0), x["name"]))

for r in reds:
    catalog_flag = "[CATALOG]" if r["in_catalog"] else "[WORLD/BOX]"
    print(f"{catalog_flag:11} | ID: {r['id']:9} | SoundId: {str(r['soundId']):4} | Size: {str(r['size']):6} | Price: {r['price']:>10,} | {r['name']}")
