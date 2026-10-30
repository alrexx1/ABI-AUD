import shutil
import os

audio_dir = 'audio'

if os.path.exists(os.path.join(audio_dir, 'Item_GoldChain_Up.ogg')):
    shutil.copyfile(os.path.join(audio_dir, 'Item_GoldChain_Up.ogg'), os.path.join(audio_dir, 'Item_Necklace_Up.ogg'))
    print("Created Item_Necklace_Up.ogg")

if os.path.exists(os.path.join(audio_dir, 'Item_GoldChain_Down.ogg')):
    shutil.copyfile(os.path.join(audio_dir, 'Item_GoldChain_Down.ogg'), os.path.join(audio_dir, 'Item_Necklace_Down.ogg'))
    print("Created Item_Necklace_Down.ogg")

print("Total files in audio/:", len(os.listdir(audio_dir)))
