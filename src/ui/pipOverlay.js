/**
 * ABI SOUND MASTER - OVERLAY TÁCTICO FLOTANTE (DOCUMENT PICTURE-IN-PICTURE)
 * Ventana Always-on-Top nativa para visualizar el radar encima del juego.
 */

import { state } from '../core/state.js';
import { ITEM_FALLBACK_SVG, setItemImageWithFallback } from '../core/constants.js';

export async function toggleRadarPiP() {
  if ('documentPictureInPicture' in window) {
    if (state.vision.pipWindow) {
      state.vision.pipWindow.close();
      state.vision.pipWindow = null;
      const pipBtn = document.getElementById('btn-toggle-pip');
      if (pipBtn) pipBtn.classList.remove('active');
      return;
    }

    try {
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: 360,
        height: 195
      });
      state.vision.pipWindow = pipWin;

      const style = pipWin.document.createElement('style');
      style.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #070a0f; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding: 10px; overflow: hidden; border: 1.5px solid #06b6d4; border-radius: 8px; user-select: none;
        }
        .pip-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px; }
        .pip-title { font-family: monospace; font-size: 11px; font-weight: 700; color: #06b6d4; letter-spacing: 0.8px; }
        .pip-pill { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; }
        .pip-pill.red { background: rgba(239, 68, 68, 0.25); color: #ef4444; border: 1px solid #ef4444; }
        .pip-pill.gold { background: rgba(245, 158, 11, 0.25); color: #f59e0b; border: 1px solid #f59e0b; }
        .pip-pill.idle { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
        .pip-body { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
        .pip-img { width: 54px; height: 54px; border-radius: 6px; border: 1px solid #334155; object-fit: contain; background: #0b111e; flex-shrink: 0; }
        .pip-info { flex: 1; min-width: 0; }
        .pip-name { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pip-price { font-family: monospace; color: #10b981; font-size: 11px; margin-top: 2px; }
        .pip-meta { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 4px; }
        .pip-meter-bg { width: 100%; height: 4px; background: #1e293b; border-radius: 2px; margin-top: 8px; overflow: hidden; }
        .pip-meter-fill { width: 0%; height: 100%; background: #06b6d4; transition: width 0.08s ease; }
      `;
      pipWin.document.head.appendChild(style);

      pipWin.document.body.innerHTML = `
        <div class="pip-head">
          <span class="pip-title">ABI RADAR TÁCTICO</span>
          <span class="pip-pill idle" id="pip-pill">ESCUCHANDO</span>
        </div>
        <div class="pip-body">
          <img class="pip-img" id="pip-img" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='54' height='54' fill='%231e293b'><rect width='54' height='54'/></svg>" alt="" />
          <div class="pip-info">
            <div class="pip-name" id="pip-name">Esperando Drop en Raid...</div>
            <div class="pip-price" id="pip-price">-- Koens</div>
            <div class="pip-meta">
              <span id="pip-size">Casilla: Auto</span>
              <span id="pip-conf">Certeza: --</span>
            </div>
          </div>
        </div>
        <div class="pip-meter-bg">
          <div class="pip-meter-fill" id="pip-meter"></div>
        </div>
      `;

      pipWin.addEventListener('pagehide', () => {
        state.vision.pipWindow = null;
        const pipBtn = document.getElementById('btn-toggle-pip');
        if (pipBtn) pipBtn.classList.remove('active');
      });

      const pipBtn = document.getElementById('btn-toggle-pip');
      if (pipBtn) pipBtn.classList.add('active');

    } catch (err) {
      console.warn('[PiP] No se pudo abrir Document PiP:', err);
    }
  } else {
    alert('Tu navegador no soporta Document Picture-in-Picture. Te recomendamos Google Chrome o Microsoft Edge para tener la ventana táctica flotante sobre tu juego.');
  }
}

export function updatePiPHUD(item, sound, confidence) {
  const win = state.vision.pipWindow;
  if (!win || win.closed) return;

  const doc = win.document;
  const pill = doc.getElementById('pip-pill');
  const img = doc.getElementById('pip-img');
  const name = doc.getElementById('pip-name');
  const price = doc.getElementById('pip-price');
  const size = doc.getElementById('pip-size');
  const conf = doc.getElementById('pip-conf');

  if (sound.isGuaranteedRed) {
    if (pill) { pill.className = 'pip-pill red'; pill.textContent = '🔴 100% ROJO'; }
  } else if (sound.hasRed) {
    if (pill) { pill.className = 'pip-pill gold'; pill.textContent = `🟡 ${sound.redRatio}% ROJO`; }
  } else {
    if (pill) { pill.className = 'pip-pill idle'; pill.textContent = '⚪ DESCARTAR'; }
  }

  if (img && item) {
    setItemImageWithFallback(img, item);
  }
  if (name && item) name.textContent = item.nameEs || item.name;
  if (price && item) price.textContent = `~${(item.referencePrice || 0).toLocaleString()} Koens`;
  if (size && item) size.textContent = `[${item.sizeLabel || '1x1'}]`;
  if (conf) conf.textContent = `${confidence}% Certeza`;
}

