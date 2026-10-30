import os
import wave
import math
import struct
import json

# Let's inspect some of our ogg files using soundfile or an audio reader if available, or write a decoder
try:
    import soundfile as sf
    has_sf = True
except ImportError:
    has_sf = False

print(f"soundfile available: {has_sf}")

if not has_sf:
    # We can check with node.js since node has web audio or ffmpeg / ogg decoder
    print("Will test with Node.js script using AudioContext or decodeAudioData")
