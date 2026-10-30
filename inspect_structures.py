import json

with open('merchant_full_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Profiles count:", len(data['profiles']))
for p in data['profiles'][:3]:
    print(" Profile:", p['label'], "Maps:", p['maps'])

print("\nTypes count:", len(data['types']))
for t in data['types'][:5]:
    print(" Type:", t)

print("\nPools count:", len(data['pools']))
for pool in data['pools'][:5]:
    print(" Pool sample:", pool)
