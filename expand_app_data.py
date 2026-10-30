import json
import re

with open('catalog_unpacked.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

with open('items_index_unpacked.json', 'r', encoding='utf-8') as f:
    items_index = json.load(f)

with open('items_details_unpacked.json', 'r', encoding='utf-8') as f:
    items_details = json.load(f)

with open('localization_en.json', 'r', encoding='utf-8') as f:
    loc = json.load(f)

item_names_en = loc.get("UACommonItemTable", {}).get("Name", {})
items_dict = items_index.get("items", {})
details_dict = items_details.get("items", {})

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
    "Double-Neck Lute": "Laúd doble c. (Laúd de Doble Mástil)",
    "Gold Lion Statue": "Estatua de León Dorado",
    "Skyhook Synchronized Array Mirror": "EMS (Espejo Matriz Sincronizada)",
    "Phaethon's Clock": "Reloj de Faetón",
    "EEG": "Electroencefalógrafo (EEG)",
    "MRID Clamshell Laptop": "Portátil Plegable MRID",
    "Prototype Calculation Module": "Módulo Prototipo de Cálculo",
    "Real Matrix": "Matriz Real",
    "Target Positioning Module": "Módulo posición obj. (Posicionamiento Objetivos)",
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
    # Additional High-Tier & World Red Items
    "Secret Document": "Documento Secreto (16M+)",
    "Classified Stimulant \"Elysium\"": "Estimulante Clasificado «Elysium»",
    "Utopia Hazmat Case": "Maletín Hazmat Utopia",
    "Emerald Jade Flute": "Flauta esm. (Flauta de Jade Esmeralda)",
    "Chaotic Matter": "Materia Caótica",
    "Corrupted Clock": "Reloj Corrompido",
    "T-008 Robotic Arm": "Brazo Robótico T-008",
    "Caliburn Model": "Modelo Caliburn",
    "Island Map": "Mapa de la Isla",
    ".338 Caliber AP Ammo": "Munición AP Calibre .338",
    "7.62x54mm 7N37 Ammo": "Munición 7N37 7.62x54mm",
    "7.62x51mm M61 Ammo": "Munición M61 7.62x51mm",
    "7.62x54mm SNB Ammo": "Munición SNB 7.62x54mm",
    # Gold & Notable Items
    "Antenna": "Antena",
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
    "Energy Items": "Energía y Baterías",
    "Ammunition": "Munición de Élite"
}

ACOUSTIC_PROFILES = {
    1: {"name": "Componente Mediano", "desc": "Clic sordo de componente mediano, plástico/metal liviano.", "tag": "Común / Basura"},
    2: {"name": "Contenedor Metálico Pesado", "desc": "Golpe metálico resonante, tipo bidón o maletín pesado. Alberga el Maletín Hazmat Utopia (4.5M).", "tag": "🔴 Rojo Maletín Hazmat"},
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
    18: {"name": "Metal Romo Pequeño", "desc": "Ruido denso y compacto. ¡Alberga 12 ÍTEMS ROJOS (Espejo, TV Cápsula, Robot, Brazo T-008, etc.)!", "tag": "🔴 Foco Rojos (12)"},
    19: {"name": "Contenedor Metálico Pequeño", "desc": "Lata pequeña o estuche de hojalata.", "tag": "Lata"},
    20: {"name": "Objeto Romo Grande", "desc": "Impacto pesado muy sordo y denso.", "tag": "Pesado"},
    21: {"name": "Madera Pequeña", "desc": "Golpecito seco de bloque de madera pequeño.", "tag": "Madera"},
    22: {"name": "Metal Agudo Cristalino (Crisp)", "desc": "Tintineo metálico de alta frecuencia. ¡El sonido con MÁS ROJOS (Máscara, Dawn, Reloj, Materia Caótica)! ", "tag": "🔴 REY DE ROJOS (10)"},
    23: {"name": "Tela / Ropa Pequeña", "desc": "Caída silenciosa de trapo o tejido suave.", "tag": "Tela"},
    24: {"name": "Cristal Pequeño / Frasco", "desc": "Tintineo agudo de ampolla o frasco de cristal. ¡Contiene Estimulante Clasificado «Elysium» (4.5M)!", "tag": "🔴 Rojo Elysium (4.5M)"},
    25: {"name": "Instrumento de Viento / Reloj Madera", "desc": "Golpe acústico de caja o madera fina. ¡Contiene la Flauta de Jade Esmeralda (1.53M)!", "tag": "🔴 Rojo Flauta Jade"},
    26: {"name": "Vidrio / Botella", "desc": "Ruido cristalino de botella o lente óptica.", "tag": "Vidrio"},
    27: {"name": "Bolsa de Alimento / Empaque", "desc": "Crujido de empaque hermético o bolsa de ración.", "tag": "Bolsa"},
    28: {"name": "Escultura Metálica Pesada (Statue)", "desc": "¡CLANG EXCLUSIVO! Estatua de León Dorado (Rojo) y Guepardo Dorado. En 3x2 es 100% LEÓN.", "tag": "🔴 100% LEÓN / GUEPARDO"},
    29: {"name": "Moneda / Metal Fino Suelto", "desc": "Monedas chocando entre sí.", "tag": "Monedas"},
    30: {"name": "Cristal / Porcelana Fina Mediana", "desc": "¡SONIDO DE JARRÓN! Cristal fino y resonante. ¡Vase (1.37M) y Bebida Ámbar (1.54M)!", "tag": "🔴 90% JARRÓN / ÁMBAR"},
    31: {"name": "Carcasa de Reloj", "desc": "Metal de campana de despertador o esfera. Alberga el Reloj Corrompido (1.43M).", "tag": "🔴 Rojo Reloj Corrompido"},
    32: {"name": "Tetera Antigua de Porcelana", "desc": "¡100% ROJO GARANTIZADO! Tintineo inconfundible de tetera. ¡COMPRA SEGURA!", "tag": "🔥 100% ROJO PURO (TETERA)"},
    33: {"name": "Cadena de Oro y Joyas", "desc": "Cascabel de eslabones de oro deslizándose. ¡Collar de Gemas y Colgante de Kamona!", "tag": "🔴 Joyas Rojas"},
    34: {"name": "Papel / Libreta Mediana", "desc": "Sonido sordo de bloc de notas o revista.", "tag": "Papel"},
    35: {"name": "Documento / Hoja Suelta", "desc": "¡EL SONIDO MÁS VALIOSO DEL JUEGO! Folio de papel. ¡DOCUMENTO SECRETO (16M+)! Alerta máxima.", "tag": "💎 DOCUMENTO SECRETO (16M+)"},
    36: {"name": "Estatua / Piedra Tallada", "desc": "Golpe denso de estatuilla. ¡Escultura Majestuosa (1.58M), Serpiente Dorada y Modelo!", "tag": "🔴 Esculturas Rojas"},
    37: {"name": "Carpeta / Plano Grande", "desc": "Hojas grandes de cartulina o carpeta archivadora. Alberga el Mapa de la Isla.", "tag": "🔴 Rojo Mapa Isla"},
    38: {"name": "Radio Militar Metálica", "desc": "Ruido de aparato de radio y perillas.", "tag": "Radio"}
}

# Special mappings for World / Non-catalog Reds:
SPECIAL_RED_MAPPINGS = {
    408080027: {"soundId": 35, "categoryName": "Paper", "describe": "El documento militar más clasificado y codiciado de toda la Zona Oscura. ¡Vale más de 16 millones de Koens!"}, # Secret Document
    408080087: {"soundId": 24, "categoryName": "Miscellaneous Medical Item", "describe": "Estimulante militar experimental ultra raro de alto valor."}, # Elysium
    408080040: {"soundId": 2, "categoryName": "Collectibles", "describe": "Contenedor hermético reforzado de máxima seguridad con tecnología de Utopia."}, # Utopia Hazmat Case
    498080026: {"soundId": 25, "categoryName": "Instruments", "describe": "Flauta de colección tallada en jade puro con un timbre acústico único."}, # Emerald Jade Flute
    498080012: {"soundId": 22, "categoryName": "Collectibles", "describe": "Objeto anómalo ultrarraro que desafía las leyes físicas."}, # Chaotic Matter
    498080024: {"soundId": 31, "categoryName": "Collectibles", "describe": "Reloj de precisión distorsionado con grabado ceremonial."}, # Corrupted Clock
    498080004: {"soundId": 18, "categoryName": "Tools", "describe": "Brazo robótico de alta tecnología utilizado en instalaciones clasificadas."}, # T-008 Robotic Arm
    498080041: {"soundId": 18, "categoryName": "Collectibles", "describe": "Maqueta de aleación del legendario prototipo Caliburn."}, # Caliburn Model
    408080032: {"soundId": 37, "categoryName": "Paper", "describe": "Mapa cartográfico detallado con rutas secretas de la Isla."}, # Island Map
    202150001: {"soundId": 18, "categoryName": "Ammunition", "describe": "Munición perforante de máxima penetración para rifles de francotirador pesado."},
    202020003: {"soundId": 18, "categoryName": "Ammunition", "describe": "Munición militar 7N37 de penetración blindada nivel 6."},
    202060003: {"soundId": 18, "categoryName": "Ammunition", "describe": "Munición perforante M61 para fusiles 7.62x51 OTAN."},
    202020005: {"soundId": 18, "categoryName": "Ammunition", "describe": "Munición perforante SNB de grado militar."}
}

catalog_items = {it["id"]: it for it in catalog.get("items", [])}
sounds_map = {s["id"]: s for s in catalog.get("sounds", [])}

# Build full items list
items = []
processed_ids = set()

# 1. First add all catalog items
for c_it in catalog.get("items", []):
    cid = c_it["id"]
    processed_ids.add(cid)
    
    idx_info = items_dict.get(str(cid), {})
    name = item_names_en.get(str(cid), f"Item #{cid}")
    name_es = ES_TRANSLATIONS.get(name, name)
    cat_name = c_it.get("categoryName", "Otros")
    cat_es = CATEGORY_ES.get(cat_name, cat_name)
    rarity = idx_info.get("rarity", 1)
    sid = c_it.get("soundId", 0)
    sound_def = sounds_map.get(sid, {})
    
    icon_id = idx_info.get("iconId") or cid
    price = idx_info.get("contactPrice") or idx_info.get("referencePrice") or idx_info.get("price") or 0
    size = idx_info.get("size") or [1, 1]
    
    it = {
        'id': cid,
        'name': name,
        'nameEs': name_es,
        'rarity': rarity,
        'isRed': (rarity == 6),
        'isGold': (rarity == 5),
        'isWorldRed': False,
        'referencePrice': price,
        'contactPrice': price,
        'size': size,
        'sizeLabel': f"{size[0]}x{size[1]}",
        'category': c_it.get('category', 0),
        'categoryName': cat_name,
        'categoryNameEs': cat_es,
        'soundId': sid,
        'pickupSound': sound_def.get('pickup', ''),
        'dropSound': sound_def.get('drop', ''),
        'iconUrl': f"https://hexaov91.github.io/abi-assets/image/Normal/{icon_id}.png",
        'describe': c_it.get('describe', '')
    }
    items.append(it)

# 2. Add all Tier 6 items that were not in catalog (Secret Document, Elysium, etc.)
for str_id, it_info in items_dict.items():
    i_id = int(str_id)
    if it_info.get("rarity") == 6 and i_id not in processed_ids:
        processed_ids.add(i_id)
        name = item_names_en.get(str_id, f"Tier 6 Item #{i_id}")
        name_es = ES_TRANSLATIONS.get(name, name)
        
        spec = SPECIAL_RED_MAPPINGS.get(i_id, {})
        sid = spec.get("soundId", 18)
        sound_def = sounds_map.get(sid, {})
        
        cat_name = spec.get("categoryName", "Collectibles")
        cat_es = CATEGORY_ES.get(cat_name, cat_name)
        
        price = it_info.get("contactPrice") or it_info.get("price") or it_info.get("referencePrice") or 1500000
        icon_id = it_info.get("iconId") or i_id
        
        describe = spec.get("describe") or f"Ítem legendario de Nivel 6 (Rojo) en Arena Breakout: Infinite."
        
        it = {
            'id': i_id,
            'name': name,
            'nameEs': name_es,
            'rarity': 6,
            'isRed': True,
            'isGold': False,
            'isWorldRed': True,
            'referencePrice': price,
            'contactPrice': price,
            'size': it_info.get('size', [1, 1]),
            'sizeLabel': f"{it_info.get('size', [1, 1])[0]}x{it_info.get('size', [1, 1])[1]}",
            'category': 1,
            'categoryName': cat_name,
            'categoryNameEs': cat_es,
            'soundId': sid,
            'pickupSound': sound_def.get('pickup', ''),
            'dropSound': sound_def.get('drop', ''),
            'iconUrl': f"https://hexaov91.github.io/abi-assets/image/Normal/{icon_id}.png",
            'describe': describe
        }
        items.append(it)

# Build sounds array
sounds = []
for s in catalog.get('sounds', []):
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
        'redItems': [{'id': r['id'], 'name': r['name'], 'nameEs': r['nameEs'], 'price': r['contactPrice'], 'size': r['size'], 'isWorldRed': r['isWorldRed']} for r in reds],
        'items': [{'id': it['id'], 'name': it['name'], 'nameEs': it['nameEs'], 'rarity': it['rarity'], 'price': it['contactPrice'], 'size': it['size'], 'isWorldRed': it.get('isWorldRed', False)} for it in sound_items]
    }
    sounds.append(sound_obj)

# Sort sounds so Red sounds are first / highlighted
sounds.sort(key=lambda x: (x['isGuaranteedRed'], x['hasRed'], x['redCount'], x['id']), reverse=True)

# Build list of all reds for the Encyclopedia
all_reds = [it for it in items if it['isRed']]
all_reds.sort(key=lambda x: (-x['contactPrice'], x['nameEs']))

print(f"Total items in expanded database: {len(items)}")
print(f"Total red items: {len(all_reds)}")
print(f"Total sounds: {len(sounds)}")

# Write to app_data.js
js_content = f"""// Base de datos oficial ABI - Field Merchant Sound & Radar Engine (Season 7 Utopia)
// Expandida con 45 Ítems Rojos (incluyendo Documento Secreto de 16M+, Elysium, Maletín Hazmat Utopia, etc.)
// 38 perfiles acústicos oficiales (.ogg dual Drop/Pickup), 202 ítems completos y 310 pools de vendedor

const ABI_DATA = {{
    version: "1.0.0.151.14",
    totalRedsCount: {len(all_reds)},
    allReds: {json.dumps(all_reds, ensure_ascii=False, indent=2)},
    sounds: {json.dumps(sounds, ensure_ascii=False, indent=2)},
    items: {json.dumps(items, ensure_ascii=False, indent=2)},
    profiles: {json.dumps(catalog.get('profiles', []), ensure_ascii=False, indent=2)},
    types: {json.dumps(catalog.get('types', []), ensure_ascii=False, indent=2)},
    pools: {json.dumps(catalog.get('pools', []), ensure_ascii=False, indent=2)}
}};

if (typeof module !== 'undefined' && module.exports) {{
    module.exports = ABI_DATA;
}}
"""

with open('app_data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Updated app_data.js successfully!")
