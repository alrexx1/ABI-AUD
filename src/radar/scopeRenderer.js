/**
 * ABI SOUND MASTER - RENDERIZADOR DEL OSCILOSCOPIO Y RADAR CIRCULAR
 * Visualización a 60 FPS en Canvas con estela de fósforo y espectrómetro de 24 bandas.
 */

import { state } from '../core/state.js';
import { RADAR_FREQS } from '../core/constants.js';

export function startRadarScope() {
  if (state.radar.animationId) return;

  const canvas = document.getElementById('radar-scope-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const timeFloatArray = new Float32Array(2048);
  const freqByteData = new Uint8Array(1024);

  function renderScope() {
    state.radar.animationId = requestAnimationFrame(renderScope);

    // Limpiar canvas con estela táctica
    ctx.fillStyle = 'rgba(4, 6, 9, 0.40)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = 68;
    const radius = 62;

    // Dibujar haz de radar giratorio
    state.radar.sweepAngle = (state.radar.sweepAngle + 0.038) % (Math.PI * 2);

    if (state.radar.active) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, state.radar.sweepAngle - 0.35, state.radar.sweepAngle);
      ctx.closePath();
      const sweepGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
      sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
      sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      ctx.restore();
    }

    // Si el radar no está activo o no hay analizador, dibujar línea plana y salir
    if (!state.radar.active || !state.radar.analyserNode) {
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(canvas.width, cy);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const meter = document.getElementById('radar-energy-meter');
      if (meter) meter.style.width = '0%';
      const liveRmsEl = document.getElementById('radar-live-rms');
      if (liveRmsEl) liveRmsEl.textContent = '0.000';
      return;
    }

    // Obtener datos PCM y FFT
    state.radar.analyserNode.getFloatTimeDomainData(timeFloatArray);
    state.radar.analyserNode.getByteFrequencyData(freqByteData);

    const currentRms = state.radar.currentRms || 0;

    // Actualizar texto de nivel en vivo
    const liveRmsEl = document.getElementById('radar-live-rms');
    if (liveRmsEl) {
      liveRmsEl.textContent = currentRms.toFixed(3);
      if (currentRms >= state.radar.threshold) {
        liveRmsEl.style.color = '#ef4444';
      } else {
        liveRmsEl.style.color = 'var(--accent-cyan)';
      }
    }

    // Actualizar medidor VU visual
    const meter = document.getElementById('radar-energy-meter');
    if (meter) {
      const pct = Math.min(100, Math.round(((currentRms - 0.003) / (0.060 - 0.003)) * 100));
      meter.style.width = `${Math.max(0, pct)}%`;

      if (state.vision.pipWindow && !state.vision.pipWindow.closed) {
        const pipMeter = state.vision.pipWindow.document.getElementById('pip-meter');
        if (pipMeter) pipMeter.style.width = `${Math.max(0, pct)}%`;
      }
    }

    // 1. Osciloscopio con estela
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = (currentRms > state.radar.threshold) ? '#ef4444' : '#10b981';

    const sliceWidth = canvas.width / timeFloatArray.length;
    let x = 0;

    for (let i = 0; i < timeFloatArray.length; i++) {
      const v = timeFloatArray[i];
      const y = cy + (v * 58);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();

    // 2. Línea divisoria HUD
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.20)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, 138);
    ctx.lineTo(canvas.width, 138);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(6, 182, 212, 0.65)';
    ctx.font = '700 8px monospace';
    ctx.fillText('ESPECTRÓMETRO FÍSICO 24 BANDAS (DSP REAL-TIME)', 10, 147);

    // 3. Espectrómetro táctico de 24 bandas
    const numBands = RADAR_FREQS.length;
    const barTotalWidth = canvas.width / numBands;
    const barWidth = barTotalWidth - 3;
    const sampleRate = (state.radar.audioContext && state.radar.audioContext.sampleRate) || 48000;
    const baseBottomY = 222;

    for (let f = 0; f < numBands; f++) {
      const targetFreq = RADAR_FREQS[f];
      const bin = Math.min(1023, Math.round((targetFreq * 2048) / sampleRate));
      const rawEnergy = freqByteData[bin] / 255;

      // Suavizado dinámico
      state.radar.liveBandEnergies[f] = Math.max(rawEnergy, (state.radar.liveBandEnergies[f] || 0) * 0.82);
      // Retención de pico (peak hold)
      state.radar.liveBandPeaks[f] = Math.max(rawEnergy, (state.radar.liveBandPeaks[f] || 0) - 0.012);

      const energy = state.radar.liveBandEnergies[f];
      const barH = Math.max(2, energy * 68);
      const bx = f * barTotalWidth + 1.5;
      const by = baseBottomY - barH;

      // Resonancias clave de ítems rojos
      const isKeyRedHarmonic = (targetFreq === 4200 || targetFreq === 5100 || targetFreq === 1350 || targetFreq === 6400 || targetFreq === 1650 || targetFreq === 2050);

      if (isKeyRedHarmonic && energy > 0.25) {
        ctx.fillStyle = energy > 0.55 ? '#ef4444' : '#f59e0b';
      } else {
        ctx.fillStyle = energy > 0.45 ? '#06b6d4' : 'rgba(6, 182, 212, 0.55)';
      }

      ctx.fillRect(bx, by, barWidth, barH);

      // Peak hold dot
      const peakY = baseBottomY - Math.max(3, state.radar.liveBandPeaks[f] * 68);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, peakY, barWidth, 1.5);
    }
  }

  renderScope();
}

