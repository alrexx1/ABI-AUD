import json
import os

with open('audio_unpacked.json', 'r', encoding='utf-8') as f:
    audio = json.load(f)

local_files = os.listdir('audio')
local_bases = {f.replace('.ogg', '') for f in local_files}

print("Local audio files count:", len(local_files))
print("Remote audio events count:", len(audio))

missing_events = []
found_events = []

for item in audio:
    event_name = item[0]
    remote_path = item[1][0]
    if event_name in local_bases:
        found_events.append((event_name, remote_path))
    else:
        # Check case-insensitive
        match = None
        for lb in local_bases:
            if lb.lower() == event_name.lower():
                match = lb
                break
        if match:
            found_events.append((event_name, remote_path))
        else:
            missing_events.append((event_name, remote_path))

print(f"\nFound events locally: {len(found_events)}")
print(f"Missing events: {len(missing_events)}")
for evt, path in missing_events:
    print(f"  MISSING: {evt:30} -> {path}")
