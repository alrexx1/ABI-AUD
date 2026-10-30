import json

with open('audio_unpacked.json', 'r', encoding='utf-8') as f:
    audio = json.load(f)

print(f"Total audio entries: {len(audio)}")
for item in audio:
    event_name = item[0]
    files = item[1]
    print(f"{event_name:35} -> {files}")
