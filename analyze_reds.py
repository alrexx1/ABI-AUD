import json

with open('merchant_full_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

items = data['items']
red_items = [it for it in items if it.get('rarity') == 6]

print(f"Total red items: {len(red_items)}")
for it in sorted(red_items, key=lambda x: x['referencePrice'], reverse=True):
    print(f"ID: {it['id']} | {it['name']} | Size: {it['size']} | Price: {it['referencePrice']:,} | Sound ID: {it['soundId']} | Drop: {it['dropSound']}")

# Let's see which sound IDs contain red items
red_sound_ids = set(it['soundId'] for it in red_items)
print(f"\nSound IDs associated with red items ({len(red_sound_ids)}):", sorted(list(red_sound_ids)))

# Check which items share those sound IDs (fakes/traps)
traps = {}
for sid in red_sound_ids:
    items_with_sound = [it for it in items if it['soundId'] == sid]
    reds = [it for it in items_with_sound if it['rarity'] == 6]
    non_reds = [it for it in items_with_sound if it['rarity'] < 6]
    traps[sid] = {
        'reds': [r['name'] for r in reds],
        'non_reds': [nr['name'] for nr in non_reds]
    }

print("\nTraps / Confusion Analysis (Shared Sound IDs):")
for sid, info in sorted(traps.items()):
    pure = len(info['non_reds']) == 0
    status = "100% RED ONLY!" if pure else f"SHARED with {len(info['non_reds'])} non-red items"
    print(f"Sound ID {sid}: [{status}]")
    print(f"   Reds: {', '.join(info['reds'])}")
    if info['non_reds']:
        print(f"   Non-reds: {', '.join(info['non_reds'][:4])}{'...' if len(info['non_reds']) > 4 else ''}")
