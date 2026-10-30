/**
 * ABI SOUND MASTER - COMPARADOR ACÚSTICO A / B
 * Duelos auditivos predefinidos para afinar el oído entre Ítems Rojos y sus imitaciones doradas.
 */

import { playSoundFile, playSynthSFX } from '../audio/audioEngine.js';

export const COMPARE_PRESETS_DATA = Object.freeze({
  lion_vs_cheetah: {
    itemA: { id: 408080008, title: 'Estatua de León Dorado (Rojo)', desc: 'Objeto de 3x2. Pesa en el inventario. Sonido profundo de escultura maciza.' },
    itemB: { id: 408080036, title: 'Estatua de Guepardo Dorado (Dorado)', desc: 'Objeto de 2x2. Mismo archivo acústico #28, ¡pero NUNCA cabe en una caja de 3x2!' }
  },
  vase_vs_mutant: {
    itemA: { id: 408080003, title: 'Jarrón de Porcelana (Vase - Rojo)', desc: 'Valor: 1,373,625 K. Tintineo cristalino agudo de alta resonancia (#30).' },
    itemB: { id: 408070001, title: 'Muestra de Corazón Mutante (Dorado)', desc: 'Frasco de vidrio biológico con muestra médica. Comparte el tintineo de vidrio.' }
  },
  ti_vs_circuit: {
    itemA: { id: 408120013, title: 'Módulo TI (Rojo - 1.33M Koens)', desc: 'Tamaño: 2x1. Dispositivo militar de computación táctica (#10).' },
    itemB: { id: 408030008, title: 'Hebra de Paladio / Chip (Morado)', desc: 'Piezas técnicas baratas de bajo valor que emiten el mismo clic táctico.' }
  },
  mask_vs_scissors: {
    itemA: { id: 498080006, title: 'Réplica Máscara de Oro Antigua (Rojo)', desc: 'Valor: 1,647,474 K. Tintineo metálico de alta frecuencia (#22).' },
    itemB: { id: 408070009, title: 'Tijeras Médicas (Gris / Común)', desc: 'Instrumento metálico fino. ¡El sonido #22 tiene más de 20 trampas!' }
  },
  lute_vs_monitor: {
    itemA: { id: 498080025, title: 'Laúd de Doble Mástil (Rojo - 1.54M K)', desc: 'Tamaño: 2x3. Caja armónica de madera gigante (#14).' },
    itemB: { id: 408140004, title: 'Monitor de Estudio de Audio (Dorado)', desc: 'Gabinete de altavoz de madera pesada de 2x2.' }
  }
});

export function updateComparePreset(key) {
  const preset = COMPARE_PRESETS_DATA[key] || COMPARE_PRESETS_DATA.lion_vs_cheetah;
  const items = window.ABI_DATA ? window.ABI_DATA.items : [];
  const itA = items.find(it => it.id === preset.itemA.id);
  const itB = items.find(it => it.id === preset.itemB.id);

  if (!itA || !itB) return;

  const imgA = document.getElementById('slot-a-img');
  const nameA = document.getElementById('slot-a-name');
  const descA = document.getElementById('slot-a-desc');
  const btnA = document.getElementById('btn-play-slot-a');

  if (imgA) imgA.src = itA.iconUrl;
  if (nameA) nameA.textContent = preset.itemA.title;
  if (descA) descA.textContent = preset.itemA.desc;
  if (btnA) {
    btnA.onclick = () => {
      playSynthSFX('click');
      playSoundFile(itA.dropSound, preset.itemA.title, 'Drop Ítem A (Rojo)');
    };
  }

  const imgB = document.getElementById('slot-b-img');
  const nameB = document.getElementById('slot-b-name');
  const descB = document.getElementById('slot-b-desc');
  const btnB = document.getElementById('btn-play-slot-b');

  if (imgB) imgB.src = itB.iconUrl;
  if (nameB) nameB.textContent = preset.itemB.title;
  if (descB) descB.textContent = preset.itemB.desc;
  if (btnB) {
    btnB.onclick = () => {
      playSynthSFX('click');
      playSoundFile(itB.dropSound, preset.itemB.title, 'Drop Ítem B (Comparación)');
    };
  }

  const btnSeq = document.getElementById('btn-play-compare-sequence');
  if (btnSeq) {
    btnSeq.onclick = () => {
      playSynthSFX('click');
      playSoundFile(itA.dropSound, preset.itemA.title, 'Sonando Ítem A (Rojo)...');
      setTimeout(() => {
        playSoundFile(itB.dropSound, preset.itemB.title, 'Sonando Ítem B (Comparación)...');
      }, 1200);
    };
  }
}

