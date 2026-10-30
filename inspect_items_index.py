import json

with open('items_index_unpacked.json', 'r', encoding='utf-8') as f:
    items_index = json.load(f)

items = items_index.get('items', {})

sound_id_count = sum(1 for it in items.values() if it.get('soundId') is not None)
print(f"Items with soundId in items_index: {sound_id_count} / {len(items)}")

# Let's see what keys exist in items
sample_item = list(items.values())[0]
print("Sample item keys:", list(sample_item.keys()))

# Check categories of items
categories = {}
for it in items.values():
    cat = it.get('category')
    categories[cat] = categories.get(cat, 0) + 1

print("\nCategories distribution:", categories)

# Check all items with rarity >= 5 (Gold and Red)
golds_and_reds = [it for it in items.values() if it.get('rarity') in [5, 6]]
print(f"Total Gold (5) & Red (6) items: {len(golds_and_reds)}")
