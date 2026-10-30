import json
import os

with open('audio_unpacked.json', 'r', encoding='utf-8') as f:
    audio = json.load(f)

local_audio_dir = 'audio'
existing_files = set(os.listdir(local_audio_dir))

all_remote_files = set()
for item in audio:
    for f in item[1]:
        fname = os.path.basename(f)
        all_remote_files.add(fname)

print(f"Total remote audio files: {len(all_remote_files)}")
print(f"Existing local files: {len(existing_files)}")

missing = all_remote_files - existing_files
print(f"Missing audio files count: {len(missing)}")
for m in sorted(missing):
    print("  Missing:", m)
