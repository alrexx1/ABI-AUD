import urllib.request
import json
import os

urls = {
    'catalog': 'https://hexaov91.github.io/abi-assets/data/merchant/catalog.json?v=_kozK-hcPU0GpuZcZ4RJ3DaOQfo-tVIkNgiqkEx_98U',
    'items_index': 'https://hexaov91.github.io/abi-assets/data/items/index.json?v=d4aQNqVTKdamWh6wZmeJOqJ674Vf6KRrGoVjeXiz6Jc',
    'audio': 'https://hexaov91.github.io/abi-assets/data/merchant/audio.json?v=GcglGFSxMnZj_PqxAi9f_0HrHMYTqLngf7b6Itq6vjY'
}

data = {}
for name, url in urls.items():
    print(f'Fetching {name}...')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read()
        parsed = json.loads(content)
        data[name] = parsed
        with open(f'{name}_151_14.json', 'wb') as f:
            f.write(content)
    print(f'Saved {name}_151_14.json ({len(content)} bytes)')

print('\n=== ANALYSIS ===')
print('Catalog version:', data['catalog'].get('version'))
print('Items index version:', data['items_index'].get('version'))
print('Number of catalog items:', len(data['catalog'].get('items', [])))
print('Number of total items in index:', len(data['items_index'].get('items', {})))
print('Catalog sounds count:', len(data['catalog'].get('sounds', [])))
print('Audio entries count:', len(data['audio']))

# Inspect sound IDs
sounds = data['catalog'].get('sounds', [])
sound_ids = [s['id'] for s in sounds]
print('Sound IDs in catalog:', sound_ids)

# Check all items in index with rarity == 6 (red)
items_dict = data['items_index'].get('items', {})
reds_in_index = []
for item_id, item_info in items_dict.items():
    rarity = item_info.get('rarity')
    if rarity == 6 or rarity == '6':
        reds_in_index.append((item_id, item_info))

print(f'\nTotal Tier 6 (Red) items in complete items index: {len(reds_in_index)}')
for item_id, item_info in reds_in_index[:20]:
    print(f"ID: {item_id}, Name/Key: {item_info.get('name', item_info.get('id'))}, SoundId: {item_info.get('soundId')}, Size: {item_info.get('size')}")

# Check audio files list
audio_list = data['audio']
print(f'\nAudio list sample (first 5):', audio_list[:5])
