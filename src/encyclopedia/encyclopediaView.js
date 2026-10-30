/**
 * ABI SOUND MASTER - ENCICLOPEDIA DE ÍTEMS ROJOS (TIER 6)
 * Búsqueda, categorización acústica y soundboard para los 45 ítems de máximo valor.
 */

import { state } from '../core/state.js';
import { playSoundFile, playSynthSFX } from '../audio/audioEngine.js';
import { ITEM_FALLBACK_SVG } from '../core/constants.js';

export function renderEncyclopedia() {
  const grid = document.getElementById('encyclopedia-items-grid');
  if (!grid) return;

  const allItems = window.ABI_DATA ? window.ABI_DATA.items : [];
  const sounds = window.ABI_DATA ? window.ABI_DATA.sounds : [];

  const items = allItems.filter(it => it.isRed);
  const query = state.encyclopedia.searchQuery.toLowerCase().trim();
  const cat = state.encyclopedia.activeCategory;

  const filtered = items.filter(it => {
    if (query) {
      const matchesName = it.name.toLowerCase().includes(query) || it.nameEs.toLowerCase().includes(query);
      if (!matchesName) return false;
    }

    if (cat === 'world') {
      return it.isWorldRed;
    }
    if (cat === 'merchant') {
      return !it.isWorldRed;
    }
    if (cat === 'guaranteed') {
      const sound = sounds.find(s => s.id === it.soundId);
      return (sound && sound.isGuaranteedRed) || it.id === 408080027;
    }
    if (cat === 'ceramic') {
      return it.soundId === 30 || it.soundId === 32 || it.soundId === 24;
    }
    if (cat === 'sculpture') {
      return it.soundId === 28 || it.soundId === 36 || it.soundId === 6;
    }
    if (cat === 'tech') {
      return it.soundId === 10 || it.soundId === 18;
    }
    if (cat === 'jewelry') {
      return it.soundId === 33;
    }
    if (cat === 'paper') {
      return it.soundId === 35 || it.soundId === 34 || it.soundId === 37;
    }

    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg);">
        No se encontraron ítems rojos con ese criterio.
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const sound = sounds.find(s => s.id === item.soundId);
    const isPure = sound ? sound.isGuaranteedRed : false;
    const isWorld = item.isWorldRed;
    const sourceBadge = isWorld ? 
      '<span style="background: rgba(245, 158, 11, 0.2); color: var(--accent-gold); border: 1px solid var(--accent-gold); padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700;">💎 RAID / CAJA FUERTE</span>' : 
      '<span style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); border: 1px solid rgba(6, 182, 212, 0.4); padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700;">🏪 VENDEDOR CAMPO</span>';

    const isSecretDoc = item.id === 408080027;
    const cardBorder = isSecretDoc ? 'border: 2px solid var(--accent-gold); box-shadow: 0 0 20px rgba(245, 158, 11, 0.35);' : '';

    return `
      <div class="red-item-card" style="${cardBorder}">
        <div class="red-card-header">
          <div class="red-item-icon-box" style="${isSecretDoc ? 'border-color: var(--accent-gold); background: rgba(245, 158, 11, 0.15);' : ''}">
            <img src="${item.iconUrl}" alt="${item.nameEs}" loading="lazy" onerror="if(!this.dataset.cdn){this.dataset.cdn='1';this.src='https://hexaov91.github.io/abi-assets/image/Normal/${item.id}.png';}else{this.onerror=null;this.src='${ITEM_FALLBACK_SVG}';}">
          </div>
          <div class="red-item-main-info">
            <div style="margin-bottom: 0.25rem;">${sourceBadge}</div>
            <h3 class="red-item-title" style="${isSecretDoc ? 'color: var(--accent-gold);' : ''}">${item.nameEs}</h3>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${item.name}</div>
            <div class="red-item-price" style="${isSecretDoc ? 'font-size: 1.15rem; color: #fbbf24;' : ''}">
              ${item.referencePrice.toLocaleString()} Koens
            </div>
            <div class="red-item-size">Tamaño: <strong>${item.sizeLabel}</strong> &bull; ${item.categoryNameEs}</div>
          </div>
        </div>

        <div class="red-acoustic-tag">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
          <span><strong>Sonido #${item.soundId}:</strong> ${sound ? sound.name : 'Perfil Acústico Específico'}</span>
        </div>

        <div style="font-size: 0.75rem; color: var(--text-dim); line-height: 1.3;">
          ${isPure ? '🔥 <strong>Sonido exclusivo:</strong> No hay falsos que lo compartan en misterio.' : `⚠️ <strong>Peligro:</strong> Comparte acústica física con otros ítems del juego.`}
          ${item.describe ? `<div style="margin-top: 0.25rem; font-style: italic; color: #94a3b8;">${item.describe}</div>` : ''}
        </div>

        <div class="red-card-actions">
          <button class="btn-mini-audio" data-file="${item.dropSound}" data-name="${item.nameEs} (Drop)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            DROP
          </button>
          <button class="btn-mini-audio" data-file="${item.pickupSound}" data-name="${item.nameEs} (Pickup)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
            PICKUP
          </button>
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
      playSoundFile(file, name, 'Muestra acústica de ítem rojo');
    });
  });
}

