import re, json

with open('merchant.html', 'r', encoding='utf-8') as f:
    html = f.read()

chunks = list(set(re.findall(r'/_next/static/chunks/[^\"]+\.js', html)))
print(f"Total chunks: {len(chunks)}")
for c in sorted(chunks):
    print(c)

# Also check for audio or sound mentions
sound_matches = re.findall(r'https?://[^\s\"\'\\]+\.(?:mp3|ogg|wav)', html)
print(f"Direct sound files: {sound_matches}")
