/**
 * ABI SOUND MASTER - MOTOR DE VISIÓN MULTIMODAL
 * Análisis de fotogramas de pantalla en tiempo real para detección de arrastre y clasificación de casillas.
 */

import { state } from '../core/state.js';

export function startVisionTracking(stream) {
  const videoTracks = stream.getVideoTracks();
  if (videoTracks.length === 0) return;

  let videoEl = document.getElementById('radar-video-monitor');
  if (!videoEl) {
    videoEl = document.createElement('video');
    videoEl.id = 'radar-video-monitor';
    videoEl.playsInline = true;
    videoEl.muted = true;
    videoEl.autoplay = true;
    videoEl.style.display = 'none';
    document.body.appendChild(videoEl);
  }

  state.vision.videoEl = videoEl;
  videoEl.srcObject = stream;
  videoEl.play().catch(e => console.warn('[Vision] Error al reproducir video feed:', e));

  if (!state.vision.canvas) {
    state.vision.canvas = document.createElement('canvas');
    state.vision.canvas.width = 320;
    state.vision.canvas.height = 180;
    state.vision.ctx = state.vision.canvas.getContext('2d', { willReadFrequently: true });
  }

  state.vision.isTracking = true;
  state.vision.prevLuma = null;
  state.vision.isDragging = false;

  const visionDot = document.getElementById('radar-vision-dot');
  const visionText = document.getElementById('radar-vision-text');
  if (visionDot) visionDot.className = 'vision-dot active';
  if (visionText) visionText.textContent = 'Visión: Monitoreando Pantalla';

  runVisionAnalysisLoop();
}

export function stopVisionTracking() {
  state.vision.isTracking = false;
  if (state.vision.animId) {
    cancelAnimationFrame(state.vision.animId);
    state.vision.animId = null;
  }
  if (state.vision.videoEl) {
    state.vision.videoEl.pause();
    state.vision.videoEl.srcObject = null;
  }
  state.vision.prevLuma = null;
  state.vision.isDragging = false;

  const visionDot = document.getElementById('radar-vision-dot');
  const visionText = document.getElementById('radar-vision-text');
  if (visionDot) visionDot.className = 'vision-dot';
  if (visionText) visionText.textContent = 'Visión: En Espera';
}

function runVisionAnalysisLoop() {
  if (!state.vision.isTracking) return;

  const now = performance.now();
  // Limitar procesamiento a ~20 FPS (cada 48ms) para mantener CPU < 1%
  if (now - state.vision.lastFrameTime >= 48) {
    state.vision.lastFrameTime = now;
    analyzeScreenFrame();
  }

  state.vision.animId = requestAnimationFrame(runVisionAnalysisLoop);
}

function analyzeScreenFrame() {
  const video = state.vision.videoEl;
  const canvas = state.vision.canvas;
  const ctx = state.vision.ctx;
  if (!video || video.readyState < 2 || !ctx) return;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const pixelCount = canvas.width * canvas.height;

  const currentLuma = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    currentLuma[i] = (data[idx] * 77 + data[idx + 1] * 150 + data[idx + 2] * 29) >> 8;
  }

  if (state.vision.prevLuma) {
    let changedPixels = 0;
    let minX = canvas.width;
    let maxX = 0;
    let minY = canvas.height;
    let maxY = 0;

    for (let y = 0; y < canvas.height; y++) {
      const rowOffset = y * canvas.width;
      for (let x = 0; x < canvas.width; x++) {
        const idx = rowOffset + x;
        const diff = Math.abs(currentLuma[idx] - state.vision.prevLuma[idx]);
        if (diff > 26) {
          changedPixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const visionDot = document.getElementById('radar-vision-dot');
    const visionText = document.getElementById('radar-vision-text');

    // Movimiento localizado: arrastre de caja o cursor en inventario
    const isMotionCluster = changedPixels > 60 && changedPixels < (pixelCount * 0.35);

    if (isMotionCluster) {
      const boxW = Math.max(1, maxX - minX);
      const boxH = Math.max(1, maxY - minY);
      const aspect = boxW / boxH;
      const area = boxW * boxH;

      let detected = 'all';
      if (aspect >= 0.82 && aspect <= 1.25) {
        detected = area > 1200 ? '2x2' : '1x1';
      } else if (aspect >= 1.4 && aspect <= 2.4) {
        detected = '2x1';
      } else if (aspect >= 0.42 && aspect <= 0.72) {
        detected = '1x2';
      } else if (aspect > 2.4) {
        detected = '2x3';
      } else if (aspect < 0.42) {
        detected = '1x3';
      }

      if (detected !== 'all') {
        state.vision.detectedSize = detected;
      }

      if (!state.vision.isDragging) {
        state.vision.isDragging = true;
        state.vision.dragStartTimestamp = Date.now();
        if (visionDot) visionDot.className = 'vision-dot dragging';
        if (visionText) {
          visionText.textContent = `Arrastrando [${state.vision.detectedSize !== 'all' ? state.vision.detectedSize : 'Caja'}]`;
        }
      }
    } else if (state.vision.isDragging && changedPixels < 25) {
      // EVENTO DE DROP DETECTADO: El movimiento cesó repentinamente
      const dragDuration = Date.now() - state.vision.dragStartTimestamp;
      state.vision.isDragging = false;

      if (dragDuration > 120) {
        state.vision.lastDropTimestamp = Date.now();
        const finalSize = state.vision.detectedSize;

        if (visionDot) visionDot.className = 'vision-dot drop';
        if (visionText) {
          visionText.textContent = `¡SOLTADO VISUAL [${finalSize !== 'all' ? finalSize : 'Auto'}]!`;
        }

        // Auto-asignar tamaño de casilla al radar
        if (finalSize !== 'all') {
          state.radar.selectedSize = finalSize;
          const sizeSelect = document.getElementById('radar-size-filter');
          if (sizeSelect) sizeSelect.value = finalSize;
        }

        // Sincronizar evaluación acústica inmediata
        if (state.radar.pendingCapture) {
          state.radar.pendingCapture.samplesRemaining = 0;
        }

        setTimeout(() => {
          if (visionDot && state.vision.isTracking) visionDot.className = 'vision-dot active';
          if (visionText && state.vision.isTracking) visionText.textContent = 'Visión: Monitoreando Pantalla';
        }, 1500);
      }
    }
  }

  state.vision.prevLuma = currentLuma;
}

