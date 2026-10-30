import json

with open('merchant_full_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Unique cargo prices in pools
pools = data['pools']
print(f"Total pools: {len(pools)}")

prices = sorted(list(set(p['price'] for p in pools)))
print("Cargo prices:", prices)

# Map cargo price & profile to pool items
# Let's see how cargo sizes relate to items
items_by_id = {it['id']: it for it in data['items']}

# Let's check a high-tier pool (e.g. price 470,000 or 550,000)
for p in pools:
    if p['price'] in [470000, 550000]:
        red_count = 0
        total_count = len(p['items'])
        for pool_it in p['items']:
            it_info = items_by_id.get(pool_it['id'])
            if it_info and it_info.get('rarity') == 6:
                red_count += 1
        # print first few
        print(f"Pool {p['id']} | Profile: {p['profile']} | Price: {p['price']:,} | Items: {total_count} (Reds: {red_count})")
        break
