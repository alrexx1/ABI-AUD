import urllib.request

urls = [
    "http://localhost:8080/index.html",
    "http://localhost:8080/style.css",
    "http://localhost:8080/app.js",
    "http://localhost:8080/app_data.js",
    "http://localhost:8080/audio/Prop_Acc_Statue_Down.ogg",
    "http://localhost:8080/audio/Prop_Acc_Teapot_Down.ogg",
    "http://localhost:8080/audio/Item_Misc_Med_Glass_Down.ogg"
]

all_ok = True
for u in urls:
    try:
        with urllib.request.urlopen(u) as res:
            print(f"[{res.status}] {u} ({len(res.read())} bytes)")
    except Exception as e:
        print(f"[FAIL] {u}: {e}")
        all_ok = False

if all_ok:
    print("\nALL HTTP ENDPOINTS ARE 100% WORKING AND SERVED LOCALLY!")
