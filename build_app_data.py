import json
import re

with open('merchant_full_data.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

# Spanish translations dictionary for items and categories
ES_TRANSLATIONS = {
    # Red Items
    "Ancient Golden Mask Replica": "Réplica de Máscara de Oro Antigua",
    "\"Dawn\"": "\"Amanecer\" (Dawn)",
    "Capsule TV": "Televisor de Cápsula",
    "Gilded Cage Music Box": "Caja de Música Jaula Dorada",
    "Aerospace Navigator": "Navegador Aeroespacial",
    "Majestic Sculpture": "Escultura Majestuosa",
    "Northern Stars Amber Drink": "Bebida de Ámbar de las Estrellas del Norte",
    "Double-Neck Lute": "Laúd de Doble Mástil",
    "Gold Lion Statue": "Estatua de León Dorado",
    "Skyhook Synchronized Array Mirror": "Espejo Matriz Sincronizada Skyhook",
    "Phaethon's Clock": "Reloj de Faetón",
    "EEG": "Electroencefalógrafo (EEG)",
    "MRID Clamshell Laptop": "Portátil Plegable MRID",
    "Prototype Calculation Module": "Módulo Prototipo de Cálculo",
    "Real Matrix": "Matriz Real",
    "Target Positioning Module": "Módulo de Posicionamiento de Objetivos",
    "Gem Necklace": "Collar de Gemas Preciosas",
    "Gold Snake": "Serpiente Dorada",
    "Antique Teapot": "Tetera Antigua de Porcelana",
    "\"Destiny\" Gold Clay Tablet": "Tablilla de Arcilla Dorada \"Destino\"",
    "Three-Axis Gyro Controller Prototype": "Prototipo Giroscopio Triaxial",
    "Amber Heart of Heaven": "Corazón de Ámbar del Cielo",
    "Quantum 2000 Toy Robot": "Robot de Juguete Quantum 2000",
    "Star of Kamona Pendant": "Colgante Estrella de Kamona",
    "Vase": "Jarrón de Porcelana Fina (Vase)",
    "Optoelectronic Hyperspace Model": "Modelo Hiperespacial Optoelectrónico",
    "Peacock Fan": "Abanico de Pavo Real",
    "Voice of Civilization Gold Record": "Disco de Oro Voz de la Civilización",
    "Heavenly Sphere": "Esfera Celestial",
    "Lyre": "Lira Antigua",
    "Hefra Egg": "Huevo de Hefra",
    "TI Module": "Módulo TI",
    # Gold & Notable Items
    "Gold Cheetah Statue": "Estatua de Guepardo Dorado",
    "Gold Block": "Lingote de Oro",
    "Gold Cube": "Cubo de Oro Macizo",
    "Gold Cup": "Copa Dorada",
    "Gold Bar": "Barra de Oro",
    "Gold Watch": "Reloj de Oro",
    "Diamond Ring": "Anillo de Diamante",
    "Jade Bracelet": "Pulsera de Jade",
    "Gold Bracelet": "Brazalete de Oro",
    "Gold Pen": "Bolígrafo de Oro",
    "Brooch": "Broche de Lujo",
    "Vintage Typewriter": "Máquina de Escribir Antigua",
    "Record Player": "Tocadiscos Vintage",
    "Porcelain": "Plato de Porcelana",
    "Stamp Album": "Álbum de Sellos",
    "Raw Diamond Ore": "Mineral de Diamante en Bruto",
    "Sergey 1 Satellite Model": "Maqueta Satélite Sergey 1",
    "Mutant Heart Sample": "Muestra de Corazón Mutante",
    "Mutant Evolution Sketch": "Boceto de Evolución Mutante",
    "Pheromone Test Kit": "Kit de Prueba de Feromonas",
    "Automated External Defibrillator": "Desfibrilador Externo Automático (DEA)",
    "Metal Heart": "Corazón Metálico",
    "Infrared Therapy Lamp": "Lámpara de Terapia Infrarroja",
    "Laptop Computer": "Ordenador Portátil",
    "Video Camera": "Cámara de Vídeo",
    "K7-L Cipher Machine": "Máquina Cifradora K7-L",
    "Laser Pointer Module": "Módulo Puntero Láser",
    "Gungnir Blueprint Fragments": "Fragmentos de Plano Gungnir",
    "Graphics Card": "Tarjeta Gráfica GPU",
    "Car Battery": "Batería de Coche",
    "Fuel Tank": "Depósito de Combustible",
    "Blowtorch": "Soplete de Soldadura",
    "Military Radio": "Radio Militar",
    "Deluxe Tea Set": "Juego de Té de Lujo",
    "Hydraulic Expander": "Expansor Hidráulico",
    "Vector Processor": "Procesador Vectorial",
    "UPS Unit": "Sistema de Alimentación SAI/UPS",
    "Space Lab Toybox": "Caja de Juguetes Laboratorio Espacial",
    "Sound-Muffling Cotton": "Algodón Insonorizante",
    "Titanium Alloy Plate": "Placa de Aleación de Titanio",
    "Arched Corrugated Steel Plate": "Chapa de Acero Ondulada",
    "Palladium Wire": "Hebra de Paladio",
    "Leveler": "Nivelador Óptico Militar",
    "Pocket Watch": "Reloj de Bolsillo",
    "Silver Chain": "Cadena de Plata",
    "Studio Monitor": "Monitor de Estudio de Audio"
}

CATEGORY_ES = {
    "Collectibles": "Coleccionables",
    "Electronics": "Electrónica",
    "Instruments": "Instrumentos",
    "Household Items": "Artículos del Hogar",
    "Miscellaneous Medical Item": "Médico y Salud",
    "Miscellaneous Military Item": "Militar y Táctico",
    "Paper": "Documentos y Papel",
    "Building Materials": "Materiales de Construcción",
    "Tools": "Herramientas",
    "Computer Parts": "Componentes de PC",
    "Flammables": "Inflamables y Combustibles",
    "Energy Items": "Energía y Baterías"
}

ACOUSTIC_PROFILES = {
    1: {"name": "Componente Mediano", "desc": "Clic sordo de componente mediano, plástico/metal liviano.", "tag": "Común / Basura"},
    2: {"name": "Contenedor Metálico Pesado", "desc": "Golpe metálico resonante, tipo bidón o tanque hueco.", "tag": "Pesado / Bidón"},
    3: {"name": "Tela / Textil Mediano", "desc": "Caída suave amortiguada, tela doblada o fibra.", "tag": "Textil"},
    4: {"name": "Lata / Combustible Pequeño", "desc": "Ruido plástico-metálico de bidón ligero.", "tag": "Herramienta"},
    5: {"name": "Bloque / Material Pesado", "desc": "Impacto seco, material de obra compacto.", "tag": "Material"},
    6: {"name": "Metal Resonante Nítido", "desc": "Clang metálico brillante y definido. ¡Peligro: incluye la Tablilla 'Destino'!", "tag": "🔴 Rojo Posible"},
    7: {"name": "Plástico Rígido Grande", "desc": "Golpe plástico seco y hueco.", "tag": "Plástico"},
    8: {"name": "Madera Mediana", "desc": "Golpe de madera maciza o caja tallada.", "tag": "Madera"},
    9: {"name": "Componente Pequeño Seco", "desc": "Clic fino de pieza electrónica o herramienta pequeña.", "tag": "Piezas"},
    10: {"name": "Dispositivo Electrónico Militar", "desc": "Clic táctico de carcasa plástica-metal. Contiene el codiciado MÓDULO TI.", "tag": "🔴 Rojo TI Module"},
    11: {"name": "Plástico Pequeño", "desc": "Chasquido plástico ligero de tapa o tubo.", "tag": "Común"},
    12: {"name": "Módulo Técnico Pequeño", "desc": "Sonido fino de circuito o carcasa técnica.", "tag": "Técnico"},
    13: {"name": "Gabinete de Ordenador", "desc": "Chapa metálica hueca tipo caja de PC.", "tag": "Chapa PC"},
    14: {"name": "Madera Grande Resonante", "desc": "Impacto profundo de madera hueca acústica. ¡Contiene el Laúd de Doble Mástil!", "tag": "🔴 Rojo Laúd"},
    15: {"name": "Batería / Cilindro Pequeño", "desc": "Golpecito metálico de pila cilíndrica.", "tag": "Batería"},
    16: {"name": "Accesorio Metálico Mediano", "desc": "Golpe de herramienta mediana.", "tag": "Herramienta"},
    17: {"name": "Metal Romo Mediano", "desc": "Golpe metálico opaco y pesado sin campanilleo.", "tag": "Metal Opaco"},
    18: {"name": "Metal Romo Pequeño", "desc": "Ruido denso y compacto. ¡Alberga 10 ÍTEMS ROJOS (Espejo, TV Cápsula, Robot, etc.)!", "tag": "🔴 Foco Rojos (10)"},
    19: {"name": "Contenedor Metálico Pequeño", "desc": "Lata pequeña o estuche de hojalata.", "tag": "Lata"},
    20: {"name": "Objeto Romo Grande", "desc": "Impacto pesado muy sordo y denso.", "tag": "Pesado"},
    21: {"name": "Madera Pequeña", "desc": "Golpecito seco de bloque de madera pequeño.", "tag": "Madera"},
    22: {"name": "Metal Agudo Cristalino (Crisp)", "desc": "Tintineo metálico de alta frecuencia. ¡El sonido con MÁS ROJOS (Máscara, Dawn, Reloj)! ", "tag": "🔴 REY DE ROJOS (9)"},
    23: {"name": "Tela / Ropa Pequeña", "desc": "Caída silenciosa de trapo o tejido suave.", "tag": "Tela"},
    24: {"name": "Cristal Pequeño / Frasco", "desc": "Tintineo agudo de ampolla o frasco de cristal pequeño.", "tag": "Vidrio Pequeño"},
    25: {"name": "Caja de Reloj de Madera", "desc": "Golpe de madera con resonancia de caja de música.", "tag": "Reloj Madera"},
    26: {"name": "Vidrio / Botella", "desc": "Ruido cristalino de botella o lente óptica.", "tag": "Vidrio"},
    27: {"name": "Bolsa de Alimento / Empaque", "desc": "Crujido de empaque hermético o bolsa de ración.", "tag": "Bolsa"},
    28: {"name": "Escultura Metálica Pesada (Statue)", "desc": "¡CLANG EXCLUSIVO! Estatua de León Dorado (Rojo) y Guepardo Dorado. En 3x2 es 100% LEÓN.", "tag": "🔴 100% LEÓN / GUEPARDO"},
    29: {"name": "Moneda / Metal Fino Suelto", "desc": "Monedas chocando entre sí.", "tag": "Monedas"},
    30: {"name": "Cristal / Porcelana Fina Mediana", "desc": "¡SONIDO DE JARRÓN! Cristal fino y resonante. ¡Vase (1.37M) y Bebida Ámbar (1.54M)!", "tag": "🔴 90% JARRÓN / ÁMBAR"},
    31: {"name": "Carcasa de Reloj", "desc": "Metal de campana de despertador o esfera.", "tag": "Reloj"},
    32: {"name": "Tetera Antigua de Porcelana", "desc": "¡100% ROJO GARANTIZADO! Tintineo inconfundible de tetera. ¡COMPRA SEGURA!", "tag": "🔥 100% ROJO PURO (TETERA)"},
    33: {"name": "Cadena de Oro y Joyas", "desc": "Cascabel de eslabones de oro deslizándose. ¡Collar de Gemas y Colgante de Kamona!", "tag": "🔴 Joyas Rojas"},
    34: {"name": "Papel / Libreta Mediana", "desc": "Sonido sordo de bloc de notas o revista.", "tag": "Papel"},
    35: {"name": "Documento / Hoja Suelta", "desc": "Frote y aleteo de folio de papel.", "tag": "Papel Fino"},
    36: {"name": "Estatua / Piedra Tallada", "desc": "Golpe denso de estatuilla. ¡Escultura Majestuosa (1.58M), Serpiente Dorada y Modelo!", "tag": "🔴 Esculturas Rojas"},
    37: {"name": "Carpeta / Plano Grande", "desc": "Hojas grandes de cartulina o carpeta archivadora.", "tag": "Planos"},
    38: {"name": "Radio Militar Metálica", "desc": "Ruido de aparato de radio y perillas.", "tag": "Radio"}
}

# Process items
items = []
items_by_id = {}
for raw_it in raw['items']:
    name = raw_it['name']
    name_es = ES_TRANSLATIONS.get(name, name)
    cat_name = raw_it.get('categoryName', 'Otros')
    cat_es = CATEGORY_ES.get(cat_name, cat_name)
    rarity = raw_it.get('rarity', 1)
    
    it = {
        'id': raw_it['id'],
        'name': name,
        'nameEs': name_es,
        'rarity': rarity,
        'isRed': (rarity == 6),
        'isGold': (rarity == 5),
        'referencePrice': raw_it.get('referencePrice', 0),
        'contactPrice': raw_it.get('contactPrice', 0),
        'size': raw_it.get('size', [1, 1]),
        'sizeLabel': f"{raw_it.get('size', [1, 1])[0]}x{raw_it.get('size', [1, 1])[1]}",
        'category': raw_it.get('category', 0),
        'categoryName': cat_name,
        'categoryNameEs': cat_es,
        'soundId': raw_it.get('soundId', 0),
        'pickupSound': raw_it.get('pickupSound', ''),
        'dropSound': raw_it.get('dropSound', ''),
        'iconUrl': raw_it.get('iconUrl', ''),
        'describe': raw_it.get('describe', '')
    }
    items.append(it)
    items_by_id[it['id']] = it

# Process sounds
sounds = []
for s in raw['sounds']:
    sid = s['id']
    drop = s.get('drop', '')
    pickup = s.get('pickup', '')
    profile = ACOUSTIC_PROFILES.get(sid, {
        "name": f"Sonido #{sid}",
        "desc": "Perfil acústico de contenedor/objeto de campo.",
        "tag": "Estándar"
    })
    
    sound_items = [it for it in items if it['soundId'] == sid]
    reds = [it for it in sound_items if it['isRed']]
    golds = [it for it in sound_items if it['isGold']]
    others = [it for it in sound_items if not it['isRed'] and not it['isGold']]
    
    total = len(sound_items)
    red_count = len(reds)
    
    sound_obj = {
        'id': sid,
        'drop': drop,
        'pickup': pickup,
        'name': profile['name'],
        'description': profile['desc'],
        'tag': profile['tag'],
        'hasRed': (red_count > 0),
        'isGuaranteedRed': (red_count > 0 and red_count == total),
        'redCount': red_count,
        'goldCount': len(golds),
        'otherCount': len(others),
        'totalItems': total,
        'redRatio': round((red_count / total * 100), 1) if total > 0 else 0,
        'redItems': [{'id': r['id'], 'name': r['name'], 'nameEs': r['nameEs'], 'price': r['referencePrice'], 'size': r['size']} for r in reds],
        'items': [{'id': it['id'], 'name': it['name'], 'nameEs': it['nameEs'], 'rarity': it['rarity'], 'price': it['referencePrice'], 'size': it['size']} for it in sound_items]
    }
    sounds.append(sound_obj)

# Sort sounds so Red sounds are first / highlighted
sounds.sort(key=lambda x: (x['isGuaranteedRed'], x['hasRed'], x['redCount'], x['id']), reverse=True)

# Also pack pools and profiles
profiles = raw.get('profiles', [])
types = raw.get('types', [])
pools = raw.get('pools', [])

# Write JS file
js_content = f"""// Base de datos oficial ABI - Field Merchant Sound Engine
// Extraído de versión {raw.get('version', '1.0')} (Arena Breakout: Infinite)
// Contiene 189 ítems, 38 sonidos acústicos, 32 ítems rojos y 310 pools de vendedor

const ABI_DATA = {{
    version: "{raw.get('version', '1.0')}",
    sounds: {json.dumps(sounds, ensure_ascii=False, indent=2)},
    items: {json.dumps(items, ensure_ascii=False, indent=2)},
    profiles: {json.dumps(profiles, ensure_ascii=False, indent=2)},
    types: {json.dumps(types, ensure_ascii=False, indent=2)},
    pools: {json.dumps(pools, ensure_ascii=False, indent=2)}
}};

if (typeof module !== 'undefined' && module.exports) {{
    module.exports = ABI_DATA;
}}
"""

with open('app_data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"app_data.js created successfully! ({len(items)} items, {len(sounds)} sounds)")
