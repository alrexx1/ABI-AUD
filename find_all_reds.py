import subprocess
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

cmd = ["node", "-e", """
const fs = require('fs');
const content = fs.readFileSync('app_data.js', 'utf8');
const data = new Function(content + '; return ABI_DATA;')();
console.log(JSON.stringify(data.allReds.map(r => ({
    id: r.id,
    nameEs: r.nameEs,
    size: r.sizeLabel,
    price: r.referencePrice,
    soundId: r.soundId,
    dropSound: r.dropSound
}))));
"""]

res = subprocess.check_output(cmd, encoding='utf-8')
reds = json.loads(res)
print(f"Total ítems rojos oficiales registrados: {len(reds)}\n")
for r in reds:
    print(f"🔴 ID: {r['id']} | {r['nameEs']:<40} | Casilla: [{r['size']}] | Sonido #{r['soundId']} ({r['dropSound']}) | ~{r['price']:,} Koens")

