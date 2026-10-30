/**
 * ABI SOUND MASTER - TABLA DE REFERENCIA TÁCTICA (CHEAT SHEET)
 * Lista de perfiles de sonido de campo con sus probabilidades de certeza.
 */

import { playSoundFile, playSynthSFX } from '../audio/audioEngine.js';

export function renderCheatSheet() {
  const tbody = document.getElementById('cheat-sheet-tbody');
  if (!tbody) return;

  const sounds = window.ABI_DATA ? window.ABI_DATA.sounds.filter(s => s.hasRed) : [];

  tbody.innerHTML = sounds.map(sound => {
    const redNames = sound.redItems.map(r => r.nameEs).join(', ');
    const certaintyBadge = sound.isGuaranteedRed 
      ? '<span style="color: var(--rarity-red); font-weight: 700;">🔥 100% GARANTIZADO</span>' 
      : `<span style="color: var(--accent-gold);">${sound.redRatio}% (${sound.redCount} de ${sound.totalItems})</span>`;

    return `
      <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
        <td style="padding: 10px; font-family: var(--font-mono); font-weight: 700; color: var(--accent-gold);">#${sound.id}</td>
        <td style="padding: 10px;">
          <strong>${sound.name}</strong><br>
          <small style="color: var(--text-muted);">${sound.description}</small>
        </td>
        <td style="padding: 10px; color: #fff;">
          ${redNames}
        </td>
        <td style="padding: 10px;">
          ${certaintyBadge}
        </td>
        <td style="padding: 10px;">
          <button class="btn-mini-audio" data-file="${sound.drop}" data-name="ID #${sound.id}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Drop
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-mini-audio').forEach(btn => {
    btn.addEventListener('click', () => {
      playSynthSFX('click');
      const file = btn.getAttribute('data-file');
      const name = btn.getAttribute('data-name');
      playSoundFile(file, name, 'Referencia rápida de sonido');
    });
  });
}

