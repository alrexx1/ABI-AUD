import json

with open('items_details_unpacked.json', 'r', encoding='utf-8') as f:
    details = json.load(f)

with open('localization_en.json', 'r', encoding='utf-8') as f:
    loc = json.load(f)

names = loc.get("UACommonItemTable", {}).get("Name", {})
items_det = details.get("items", {})

print(f"Total items in details: {len(items_det)}")

# Check Secret Document 408080027, Elysium 408080087, Hazmat Case 408080040, etc.
test_ids = ["408080027", "408080087", "408080040", "498080026", "498080012", "408080008", "408080010"]

for tid in test_ids:
    name = names.get(tid, tid)
    info = items_det.get(tid)
    print(f"\nID: {tid} ({name}):")
    print(json.dumps(info, indent=2))
