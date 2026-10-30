import subprocess
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

cmd = ["node", "-e", """
const fs = require('fs');
const content = fs.readFileSync('app_data.js', 'utf8');
const data = new Function(content + '; return ABI_DATA;')();
const targets = data.items.filter(it => 
    it.isRed || 
    ['antena', 'flauta', 'laúd', 'módulo posición', 'ems'].some(w => it.nameEs.toLowerCase().includes(w))
);
console.log(JSON.stringify(targets.map(t => ({
    id: t.id,
    nameEs: t.nameEs,
    name: t.name,
    rarity: t.rarity,
    isRed: t.isRed,
    size: t.sizeLabel,
    soundId: t.soundId,
    dropSound: t.dropSound,
    price: t.referencePrice
}))));
"""]

res = subprocess.check_output(cmd, encoding='utf-8')
items = json.loads(res)
print(f"--- Búsqueda de Ítems ABI: {len(items)} ítems encontrados ---\n")
for it in items:
    tag = "🔴 [ROJO]" if it.get("isRed") else "🟡 [ORO]"
    print(f"{tag} ID: {it['id']} | {it['nameEs']} | Casilla: [{it['size']}] | Sonido #{it['soundId']} ({it['dropSound']}) | ~{it['price']:,} Koens")

