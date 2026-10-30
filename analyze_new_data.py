import json

with open('catalog_unpacked.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

with open('items_index_unpacked.json', 'r', encoding='utf-8') as f:
    items_index = json.load(f)

with open('audio_unpacked.json', 'r', encoding='utf-8') as f:
    audio_data = json.load(f)

print("=== NEW DATA SUMMARY ===")
print("Catalog version:", catalog.get("version"))
print("Items in catalog:", len(catalog.get("items", [])))
print("Sounds in catalog:", len(catalog.get("sounds", [])))
print("Audio data keys/entries:", len(audio_data))

items_dict = items_index.get("items", {})
print("Total items in items_index:", len(items_dict))

# Check all rarity 6 items in items_index vs catalog
red_items_index = {}
for i_id, info in items_dict.items():
    if info.get("rarity") == 6:
        red_items_index[i_id] = info

print(f"Total Tier 6 (Reds) in items_index: {len(red_items_index)}")

# Also check catalog items
catalog_items_by_id = {str(item["id"]): item for item in catalog.get("items", [])}
print("Catalog items count:", len(catalog_items_by_id))

# Check sounds in catalog
sounds = catalog.get("sounds", [])
sound_map = {s["id"]: s for s in sounds}
print(f"Available Sound IDs ({len(sounds)}):", sorted([s["id"] for s in sounds]))

# Examine audio events
print("\nAudio data sample:")
if isinstance(audio_data, list):
    print("Audio data is list, len:", len(audio_data))
    for entry in audio_data[:10]:
        print(" ", entry)
elif isinstance(audio_data, dict):
    print("Audio data is dict, keys:", len(audio_data))
    for k, v in list(audio_data.items())[:10]:
        print(f"  {k}: {v}")

# Now let's list all Tier 6 items with details
print("\n=== ALL TIER 6 ITEMS ===")
for i_id, info in sorted(red_items_index.items(), key=lambda x: int(x[0])):
    cat_item = catalog_items_by_id.get(str(i_id), {})
    merged = {**info, **cat_item}
    sound_id = merged.get("soundId")
    sound_info = sound_map.get(sound_id, {})
    print(f"ID: {i_id:6} | SoundId: {str(sound_id):4} | Size: {merged.get('size')} | Price: {merged.get('contactPrice', merged.get('price'))} | Sound: drop={sound_info.get('drop')}, pickup={sound_info.get('pickup')}")
