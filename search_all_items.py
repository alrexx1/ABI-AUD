import json

with open('items_index_unpacked.json', 'r', encoding='utf-8') as f:
    items_index = json.load(f)

with open('localization_en.json', 'r', encoding='utf-8') as f:
    loc = json.load(f)

names = loc.get("UACommonItemTable", {}).get("Name", {})
items = items_index.get("items", {})

keywords = ["gold", "deagle", "keycard", "card", "bar", "ingot", "secret", "document", "statue", "mask", "lion", "teapot", "vase", "elysium", "utopia"]

print("=== SEARCHING KEYWORDS IN ALL 2,110 ITEMS ===")
found = []
for i_id, info in items.items():
    name = names.get(str(i_id), "")
    price = info.get("contactPrice") or info.get("price") or 0
    rarity = info.get("rarity")
    
    # check keyword in name
    if any(kw in name.lower() for kw in keywords) or (price and price > 800000) or rarity == 6:
        found.append({
            "id": i_id,
            "name": name,
            "rarity": rarity,
            "price": price,
            "size": info.get("size"),
            "soundId": info.get("soundId")
        })

found.sort(key=lambda x: (-(x["price"] or 0), x["rarity"] or 0))

print(f"Found {len(found)} candidate high-tier / special items. Top 35:")
for item in found[:35]:
    print(f"Rarity {item['rarity']} | ID: {item['id']:9} | SoundId: {str(item['soundId']):4} | Size: {str(item['size']):6} | Price: {item['price']:>10,} | {item['name']}")
