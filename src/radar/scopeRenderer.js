/**
 * ABI SOUND MASTER - RENDERIZADOR DEL OSCILOSCOPIO Y CASCADA ESPECTRAL (WATERFALL)
 * Visualización a 60 FPS en Canvas con Cascada Térmica (Frecuencia vs Tiempo),
 * trazas de resonancia T60 y osciloscopio militar de fósforo.
 */

import { state } from '../core/state.js';
import { RADAR_FREQS } from '../core/constants.js';

// Precomputar paleta de color térmico militar (256 niveles: Navy -> Cyan -> Oro -> Rojo -> Blanco)
const THERMAL_PALETTE = new Array(256);
for (let i = 0; i < 256; i++) {
  let r, g, b;
  if (i < 14) {
    r = 4; g = 6; b = 9;
  } else if (i < 64) {
    const t = (i - 14) / 50;
    r = Math.round(4 + t * (6 - 4));
    g = Math.round(6 + t * (182 - 6));
    b = Math.round(9 + t * (212 - 9));
  } else if (i < 135) {
    const t = (i - 64) / 71;
    r = Math.round(6 + t * (245 - 6));
    g = Math.round(182 + t * (158 - 182));
    b = Math.round(212 + t * (11 - 212));
  } else if (i < 205) {
    const t = (i - 135) / 70;
    r = Math.round(245 + t * (239 - 245));
    g = Math.round(158 + t * (68 - 158));
    b = Math.round(11 + t * (68 - 11));
  } else {
    const t = (i - 205) / 50;
    r = Math.round(239 + t * (255 - 239));
    g = Math.round(68 + t * (255 - 68));
    b = Math.round(68 + t * (255 - 68));
  }
  THERMAL_PALETTE[i] = `rgb(${r},${g},${b})`;
}

// Marcadores armónicos de ítems rojos clave en ABI
const KEY_RED_HARMONICS = [
  { freq: 460, label: '460Hz (León/Oro)', color: '#f59e0b' },
  { freq: 1350, label: '1.3k (TI/Circuit)', color: '#06b6d4' },
  { freq: 4200, label: '4.2k (Tetera/Vase)', color: '#ef4444' },
  { freq: 5100, label: '5.1k (Porcelana)', color: '#ef4444' },
  { freq: 6400, label: '6.4k (Máscara)', color: '#fbbf24' }
];

export function setScopeMode(mode) {
  if (['waterfall', 'split', 'scope'].includes(mode)) {
    state.radar.scopeMode = mode;

    document.querySelectorAll('.scope-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });

    const canvas = document.getElementById('radar-scope-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#040609';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }
}

export function startRadarScope() {
  if (state.radar.animationId) return;

  const canvas = document.getElementById('radar-scope-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const timeFloatArray = new Float32Array(2048);
  const freqByteData = new Uint8Array(1024);
  const interpolatedEnergy = new Float32Array(canvas.width);

  // Inicializar fondo
  ctx.fillStyle = '#040609';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function renderScope() {
    state.radar.animationId = requestAnimationFrame(renderScope);

    const mode = state.radar.scopeMode || 'waterfall';
    const currentRms = state.radar.currentRms || 0;
    const isRadarActive = state.radar.active && state.radar.analyserNode;

    // Actualizar medidores HUD de nivel en vivo
    const liveRmsEl = document.getElementById('radar-live-rms');
    if (liveRmsEl) {
      liveRmsEl.textContent = currentRms.toFixed(3);
      liveRmsEl.style.color = (currentRms >= state.radar.threshold) ? '#ef4444' : 'var(--accent-cyan)';
    }

    const meter = document.getElementById('radar-energy-meter');
    if (meter) {
      const pct = Math.min(100, Math.round(((currentRms - 0.003) / (0.060 - 0.003)) * 100));
      meter.style.width = `${Math.max(0, pct)}%`;

      if (state.vision.pipWindow && !state.vision.pipWindow.closed) {
        const pipMeter = state.vision.pipWindow.document.getElementById('pip-meter');
        if (pipMeter) pipMeter.style.width = `${Math.max(0, pct)}%`;
      }
    }

    // Dibujar haz de radar giratorio
    state.radar.sweepAngle = (state.radar.sweepAngle + 0.038) % (Math.PI * 2);

    if (isRadarActive) {
      state.radar.analyserNode.getFloatTimeDomainData(timeFloatArray);
      state.radar.analyserNode.getByteFrequencyData(freqByteData);

      const sampleRate = (state.radar.audioContext && state.radar.audioContext.sampleRate) || 48000;
      for (let f = 0; f < RADAR_FREQS.length; f++) {
        const bin = Math.min(1023, Math.round((RADAR_FREQS[f] * 2048) / sampleRate));
        const rawE = freqByteData[bin] / 255;
        state.radar.liveBandEnergies[f] = Math.max(rawE, (state.radar.liveBandEnergies[f] || 0) * 0.84);
        state.radar.liveBandPeaks[f] = Math.max(rawE, (state.radar.liveBandPeaks[f] || 0) - 0.012);
      }
    } else {
      for (let f = 0; f < RADAR_FREQS.length; f++) {
        state.radar.liveBandEnergies[f] = 0;
      }
    }

    // =========================================================================
    // MODO 1: CASCADA ESPECTRAL COMPLETA (WATERFALL 60 FPS)
    // =========================================================================
    if (mode === 'waterfall') {
      renderWaterfallFull(ctx, canvas, isRadarActive);
    }
    // =========================================================================
    // MODO 2: VISTA DUAL (50% OSCILOSCOPIO + 50% CASCADA WATERFALL)
    // =========================================================================
    else if (mode === 'split') {
      renderSplitView(ctx, canvas, isRadarActive, timeFloatArray, currentRms);
    }
    // =========================================================================
    // MODO 3: OSCILOSCOPIO CLÁSICO CON BARRAS FFT
    // =========================================================================
    else {
      renderScopeClassic(ctx, canvas, isRadarActive, timeFloatArray, currentRms);
    }
  }

  // --- Funciones de Renderizado Internas Optimizadas ---

  function renderWaterfallFull(ctx, canvas, isRadarActive) {
    const w = canvas.width;
    const h = canvas.height;
    const scrollStep = 2;

    // Desplazar la imagen anterior 2 píxeles hacia abajo por GPU
    ctx.drawImage(canvas, 0, 0, w, h - scrollStep, 0, scrollStep, w, h - scrollStep);

    // Calcular fila espectral actual con interpolación suave
    interpolateBandsAcrossWidth(w, interpolatedEnergy);

    // Dibujar la nueva línea de cascada en la parte superior (y = 0 a 2)
    for (let x = 0; x < w; x++) {
      const e = isRadarActive ? interpolatedEnergy[x] : 0;
      const palIdx = Math.min(255, Math.floor(e * 255));
      ctx.fillStyle = THERMAL_PALETTE[palIdx];
      ctx.fillRect(x, 0, 1, scrollStep);
    }

    // Líneas guías armónicas fijas para ítems rojos
    drawHarmonicGuides(ctx, w, h);

    // Barra de escala de frecuencias inferior
    ctx.fillStyle = 'rgba(4, 6, 9, 0.75)';
    ctx.fillRect(0, h - 16, w, 16);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.70)';
    ctx.font = '700 8.5px monospace';
    ctx.fillText('90Hz', 8, h - 5);
    ctx.fillText('460Hz (Oro)', 75, h - 5);
    ctx.fillText('1.3kHz (TI)', 185, h - 5);
    ctx.fillText('4.2kHz (Tetera)', 320, h - 5);
    ctx.fillText('5.1kHz (Vase)', 415, h - 5);
    ctx.fillText('14kHz', w - 38, h - 5);
  }

  function renderSplitView(ctx, canvas, isRadarActive, timeData, currentRms) {
    const w = canvas.width;
    const h = canvas.height;
    const splitY = 92;

    // 1. Limpiar mitad superior (Osciloscopio)
    ctx.fillStyle = 'rgba(4, 6, 9, 0.45)';
    ctx.fillRect(0, 0, w, splitY);

    // Radar circular pequeño
    drawRadarCircularSweep(ctx, w / 2, 45, 40, isRadarActive);

    // Osciloscopio en mitad superior
    drawOscilloscopeWave(ctx, timeData, w, splitY, 46, 38, isRadarActive, currentRms);

    // Divisor táctico
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, splitY);
    ctx.lineTo(w, splitY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Desplazar mitad inferior (Cascada Waterfall)
    const waterfallH = h - splitY - 1;
    const scrollStep = 2;
    ctx.drawImage(canvas, 0, splitY + 1, w, waterfallH - scrollStep, 0, splitY + 1 + scrollStep, w, waterfallH - scrollStep);

    interpolateBandsAcrossWidth(w, interpolatedEnergy);
    for (let x = 0; x < w; x++) {
      const e = isRadarActive ? interpolatedEnergy[x] : 0;
      const palIdx = Math.min(255, Math.floor(e * 255));
      ctx.fillStyle = THERMAL_PALETTE[palIdx];
      ctx.fillRect(x, splitY + 1, 1, scrollStep);
    }

    drawHarmonicGuides(ctx, w, h, splitY + 1);
  }

  function renderScopeClassic(ctx, canvas, isRadarActive, timeData, currentRms) {
    const w = canvas.width;
    const h = canvas.height;
    const cy = 68;

    ctx.fillStyle = 'rgba(4, 6, 9, 0.40)';
    ctx.fillRect(0, 0, w, h);

    drawRadarCircularSweep(ctx, w / 2, cy, 62, isRadarActive);
    drawOscilloscopeWave(ctx, timeData, w, h, cy, 58, isRadarActive, currentRms);

    // Línea divisoria
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.20)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, 138);
    ctx.lineTo(w, 138);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(6, 182, 212, 0.65)';
    ctx.font = '700 8px monospace';
    ctx.fillText('ESPECTRÓMETRO FÍSICO 24 BANDAS (DSP REAL-TIME)', 10, 147);

    // Barras FFT
    const numBands = RADAR_FREQS.length;
    const barTotalWidth = w / numBands;
    const barWidth = barTotalWidth - 3;
    const baseBottomY = 222;

    for (let f = 0; f < numBands; f++) {
      const targetFreq = RADAR_FREQS[f];
      const energy = state.radar.liveBandEnergies[f] || 0;
      const barH = Math.max(2, energy * 68);
      const bx = f * barTotalWidth + 1.5;
      const by = baseBottomY - barH;

      const isKeyRed = (targetFreq === 4200 || targetFreq === 5100 || targetFreq === 1350 || targetFreq === 460);
      if (isKeyRed && energy > 0.25) {
        ctx.fillStyle = energy > 0.55 ? '#ef4444' : '#f59e0b';
      } else {
        ctx.fillStyle = energy > 0.45 ? '#06b6d4' : 'rgba(6, 182, 212, 0.55)';
      }

      ctx.fillRect(bx, by, barWidth, barH);
      const peakY = baseBottomY - Math.max(3, (state.radar.liveBandPeaks[f] || 0) * 68);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, peakY, barWidth, 1.5);
    }
  }

  function interpolateBandsAcrossWidth(w, outArr) {
    const numBands = RADAR_FREQS.length;
    const step = w / (numBands - 1);

    for (let x = 0; x < w; x++) {
      const idxFloat = x / step;
      const idxLeft = Math.floor(idxFloat);
      const idxRight = Math.min(numBands - 1, idxLeft + 1);
      const frac = idxFloat - idxLeft;

      const eL = state.radar.liveBandEnergies[idxLeft] || 0;
      const eR = state.radar.liveBandEnergies[idxRight] || 0;
      outArr[x] = (eL * (1 - frac)) + (eR * frac);
    }
  }

  function drawHarmonicGuides(ctx, w, h, startY = 0) {
    ctx.setLineDash([2, 5]);
    ctx.lineWidth = 1;
    for (const hGuide of KEY_RED_HARMONICS) {
      const idx = RADAR_FREQS.findIndex(f => f >= hGuide.freq);
      if (idx >= 0) {
        const gx = Math.round((idx / (RADAR_FREQS.length - 1)) * w);
        ctx.strokeStyle = hGuide.color + '44';
        ctx.beginPath();
        ctx.moveTo(gx, startY);
        ctx.lineTo(gx, h - 16);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }

  function drawRadarCircularSweep(ctx, cx, cy, radius, isRadarActive) {
    if (isRadarActive) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, state.radar.sweepAngle - 0.35, state.radar.sweepAngle);
      ctx.closePath();
      const sweepGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
      sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0.01)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      ctx.restore();
    }
  }

  function drawOscilloscopeWave(ctx, timeData, w, maxH, cy, amp, isRadarActive, currentRms) {
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = (!isRadarActive) ? 'rgba(100, 116, 139, 0.25)' : (currentRms > state.radar.threshold) ? '#ef4444' : '#10b981';

    if (!isRadarActive) {
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();
      return;
    }

    const sliceWidth = w / timeData.length;
    let x = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i];
      const y = cy + (v * amp);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
  }

  renderScope();
}
