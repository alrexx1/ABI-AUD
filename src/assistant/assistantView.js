/**
 * ABI SOUND MASTER - VISTA DEL ASISTENTE DE RAID EN VIVO
 * Filtrado dinámico de probabilidades por tamaño de caja, precio y categoría.
 */

import { state } from '../core/state.js';
import { playSoundFile, playSynthSFX } from '../audio/audioEngine.js';

export function renderAssistantCards() {
  const grid = document.getElementById('assistant-cards-grid');
  const countEl = document.getElementById('assistant-results-count');
  if (!grid) return;

  const sounds = window.ABI_DATA ? window.ABI_DATA.sounds : [];
  const items = window.ABI_DATA ? window.ABI_DATA.items : [];

  const filteredSounds = sounds.filter(sound => {
    if (state.assistant.onlyReds && !sound.hasRed) {
      return false;
    }

    let matchingItems = sound.items.map(sIt => items.find(it => it.id === sIt.id)).filter(Boolean);

    if (state.assistant.selectedSize !== 'all') {
      matchingItems = matchingItems.filter(it => it.sizeLabel === state.assistant.selectedSize);
      if (matchingItems.length === 0) return false;
    }

    if (state.assistant.selectedCategory !== 'all') {
      matchingItems = matchingItems.filter(it => it.categoryName === state.assistant.selectedCategory);
      if (matchingItems.length === 0) return false;
    }

    return true;
  });

  if (countEl) countEl.textContent = `${filteredSounds.length}`;

  if (filteredSounds.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem;">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div style="font-family: var(--font-hud); font-size: 1.2rem; color: #fff;">No se encontraron sonidos con estos filtros</div>
        <div style="font-size: 0.85rem; margin-top: 0.25rem;">Intenta desactivar el filtro de tamaño o desmarcar "Solo Rojos".</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredSounds.map(sound => {
    let statusClass = 'no-red';
    let badgeHtml = '<span class="red-probability-badge badge-safe-skip">⚪ 0% Rojo</span>';

    if (sound.isGuaranteedRed) {
      statusClass = 'guaranteed-red';
      badgeHtml = '<span class="red-probability-badge badge-100-red">🔥 100% GARANTÍA ROJO</span>';
    } else if (sound.hasRed) {
      statusClass = 'has-red';
      badgeHtml = `<span class="red-probability-badge badge-mixed-red">🟡 ${sound.redCount} Rojo(s) (${sound.redRatio}%)</span>`;
    }

    let displayItems = sound.items.map(sIt => items.find(it => it.id === sIt.id)).filter(Boolean);
    if (state.assistant.selectedSize !== 'all') {
      displayItems = displayItems.filter(it => it.sizeLabel === state.assistant.selectedSize);
    }

    const itemsHtml = displayItems.slice(0, 5).map(it => `
      <div class="item-chip-row ${it.isRed ? 'is-red' : ''}">
        <span class="chip-name">
          ${it.isRed ? '🔴' : it.isGold ? '🟡' : '⚪'} 
          <strong>${it.nameEs}</strong> <small style="color: var(--text-dim);">(${it.sizeLabel})</small>
        </span>
        <span class="chip-price">${it.referencePrice.toLocaleString()} K</span>
      </div>
    `).join('');

    const moreItemsText = displayItems.length > 5 ? `<div style="font-size: 0.7rem; color: var(--text-dim); text-align: center;">+ ${displayItems.length - 5} ítems más...</div>` : '';

    return `
      <div class="sound-match-card ${statusClass}">
        <div class="card-top-bar">
          <div class="sound-identity">
            <span class="sound-id-pill">ID #${sound.id}</span>
            <span class="sound-name-title">${sound.name}</span>
          </div>
          ${badgeHtml}
        </div>

        <p class="sound-desc-text">${sound.description}</p>

        <div class="sound-audio-buttons">
          <button class="btn-mini-audio" data-sound-action="drop" data-file="${sound.drop}" data-name="ID #${sound.id} - ${sound.name}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Escuchar DROP
          </button>
          <button class="btn-mini-audio" data-sound-action="pickup" data-file="${sound.pickup}" data-name="ID #${sound.id} - ${sound.name}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
            Pickup
          </button>
        </div>

        <div class="potential-items-drawer">
          <div class="drawer-header">Ítems Posibles en este Sonido (${displayItems.length}):</div>
          ${itemsHtml}
          ${moreItemsText}
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.btn-mini-audio').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      playSynthSFX('click');
      const file = btn.getAttribute('data-file');
      const name = btn.getAttribute('data-name');
      const action = btn.getAttribute('data-sound-action');
      playSoundFile(file, name, action === 'drop' ? 'Sonido Drop (Soltar)' : 'Sonido Pickup (Arrastrar)');
    });
  });
}

