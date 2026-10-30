/**
 * ABI SOUND MASTER - CONSTANTES GLOBALES
 * Valores numéricos inmutables, frecuencias de resonancia y presets de configuración.
 */

// 24 Frecuencias logarítmicas calibradas para la acústica física de los ítems de ABI (Hz)
export const RADAR_FREQS = Object.freeze([
  90,    // Sub-impact (Contenedor pesado / Madera gruesa)
  140,   // Low-bass (Caja grande de armas / Suministros)
  220,   // Bass (Plástico pesado / Tambor)
  320,   // Low-mid (Madera media / Cajas médicas)
  460,   // Mid-low (Radio militar / Componentes mecánicos)
  650,   // Mid (Cajas metálicas / Baterías)
  850,   // Mid-high (Secret Document textura de papel / Fricción)
  1050,  // León Dorado cuerpo (Estatua pesada)
  1350,  // Resonancia metálica primaria (León de Oro / Guepardo)
  1650,  // Clic módulo TI #1 / Chips militares
  2050,  // Clic módulo TI #2 / Transistor cerámico
  2500,  // Papel crujiente agudo (Secret Document / Mapas / Planos)
  2950,  // Vidrio grueso / Matraz mutante
  3450,  // Resonancia cerámica baja / Tetera pre-impacto
  4200,  // RESONANCIA TETERA ANTIGUA (Prop_Acc_Teapot pico armónico)
  4650,  // Vidrio brillante
  5100,  // RESONANCIA JARRÓN DE PORCELANA (Vase - Tintineo cristalino)
  5700,  // Metal fino / Instrumentos
  6400,  // MÁSCARA DORADA (Prop_Acc_Goldmask tintineo de oro fino)
  7400,  // Cadena de oro / Collar
  8800,  // Monedas / Oro tintineo alto
  10200, // Armónico superior de porcelana y metal
  11800, // Brillo metálico
  13800  // Aire y transitorio de ataque de arrastre
]);

export const SENSITIVITY_PRESETS = Object.freeze({
  ultra: { threshold: 0.008, label: 'Ultra-Sensible (0.008)' },
  balanced: { threshold: 0.015, label: 'Equilibrado (0.015)' },
  noisy: { threshold: 0.026, label: 'Anti-Ruido (0.026)' }
});

export const GRID_SIZES = Object.freeze(['all', '1x1', '1x2', '2x1', '2x2', '2x3', '1x3']);

export const RANKS = Object.freeze([
  { minKoens: 10000000, title: 'Maestro de la Zona Oscura', badge: '💎 LEYENDA' },
  { minKoens: 5000000, title: 'Comerciante Veterano', badge: '👑 ÉLITE' },
  { minKoens: 2000000, title: 'Cazador de Rojos', badge: '🔴 VETERANO' },
  { minKoens: 500000, title: 'Oído Táctico', badge: '🎯 OPERADOR' },
  { minKoens: 0, title: 'Recluta de Campo', badge: '🔰 RECLUTA' }
]);

export const COMPARE_PRESETS = Object.freeze({
  lion_vs_cheetah: {
    title: 'León Dorado vs Guepardo Dorado',
    subtitle: 'Impacto metálico pesado (Rojo vs Dorado)',
    itemA: { id: 408080004, soundId: 28, drop: 'Prop_Acc_Statue_Down', pickup: 'Prop_Acc_Statue_UP', label: '🔴 León Dorado (1.54M)', isRed: true },
    itemB: { id: 408080005, soundId: 28, drop: 'Prop_Acc_Statue_Down', pickup: 'Prop_Acc_Statue_UP', label: '🟡 Guepardo Dorado (420k)', isRed: false },
    tip: '¡Atención! Comparten exactamente el mismo sonido de impacto (#28). La ÚNICA diferencia en el vendedor es el tamaño de la caja: el León ocupa 3x2 / 2x3 casillas y el Guepardo 2x2.'
  },
  teapot_vs_thermos: {
    title: 'Tetera Antigua vs Termo Militar',
    subtitle: 'Porcelana fina vs Metal/Plástico común',
    itemA: { id: 408080010, soundId: 32, drop: 'Prop_Acc_Teapot_Down', pickup: 'Prop_Acc_Teapot_UP', label: '🔴 Tetera Antigua (1.41M)', isRed: true },
    itemB: { id: 408080011, soundId: 30, drop: 'Prop_Acc_Fuel_Down', pickup: 'Prop_Acc_Fuel_UP', label: '⚪ Termo / Combustible (12k)', isRed: false },
    tip: 'La Tetera tiene un tintineo resonante a 4,200 Hz inconfundible. Es 100% GARANTÍA ROJO.'
  },
  vase_vs_flask: {
    title: 'Jarrón de Porcelana vs Matraz Mutante',
    subtitle: 'Tintineo cristalino de porcelana vs Vidrio grueso',
    itemA: { id: 408080006, soundId: 20, drop: 'Item_Misc_Small_Glass_Down', pickup: 'Item_Misc_Small_Glass_Up', label: '🔴 Jarrón de Porcelana (1.37M)', isRed: true },
    itemB: { id: 408080007, soundId: 10, drop: 'Item_Misc_Med_Glass_Down', pickup: 'Item_Misc_Med_Glass_Up', label: '🟡 Matraz Mutante (280k)', isRed: false },
    tip: 'El jarrón tiene un agudo cristalino a 5,100 Hz. El matraz suena más opaco y bajo.'
  },
  ti_module_vs_cpu: {
    title: 'Módulo TI vs Circuito Morado',
    subtitle: 'Microprocesador militar vs Chatarra electrónica',
    itemA: { id: 408080012, soundId: 26, drop: 'Prop_Acc_Tech_Small_Down', pickup: 'Prop_Acc_Tech_Small_UP', label: '🔴 Módulo TI (1.33M)', isRed: true },
    itemB: { id: 408080013, soundId: 12, drop: 'Item_Misc_ElectronicDevice_Down', pickup: 'Item_Misc_ElectronicDevice_Up', label: '🟣 Placa Base (45k)', isRed: false },
    tip: 'El módulo TI emite un doble clic característico a 1,650 Hz y 2,050 Hz.'
  }
});

