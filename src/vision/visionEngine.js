/**
 * ABI SOUND MASTER - MOTOR DE VISIÓN MULTIMODAL
 * Análisis de fotogramas de pantalla en tiempo real para detección de arrastre y clasificación de casillas.
 */

import { state } from '../core/state.js';

/**
 * Clasifica la geometría y orientación física de una ranura o caja de inventario en ABI.
 * Basado en los límites óptimos de razón de aspecto (Media Geométrica entre relaciones de casillas cuadradas).
 *
 * @param {number} width - Ancho en píxeles
 * @param {number} height - Alto en píxeles
 * @param {number} area - Área en píxeles (w * h)
 * @param {number} pixelCount - Cantidad de píxeles activos (croma o movimiento)
 * @returns {object} { size, orientation, aspect, confidence, label }
 */
export function classifyGridGeometry(width, height, area = 0, pixelCount = 0) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const aspect = w / h;
  const a = area > 0 ? area : (w * h);

  // 1. Detección de Orientación Física
  // Horizontal (w > h), Vertical (h > w), Cuadrada (w ≈ h)
  let orientation = 'square';
  if (aspect >= 1.18) {
    orientation = 'horizontal';
  } else if (aspect <= 0.85) {
    orientation = 'vertical';
  } else {
    orientation = 'square';
  }

  // 2. Clasificación de Tamaño de Cuadrícula con límites de media geométrica
  let size = 'all';
  let confidence = 0.70;

  if (orientation === 'horizontal') {
    // Relaciones nominales:
    // 3x2 -> 1.50 (Límite: [1.18, 1.732))
    // 2x1 -> 2.00 (Límite: [1.732, 2.449))
    // 3x1 -> 3.00 (Límite: >= 2.449)
    if (aspect >= 2.45) {
      size = '3x1';
      confidence = 0.93;
    } else if (aspect >= 1.73) {
      size = '2x1';
      confidence = 0.96;
    } else {
      size = '3x2';
      confidence = 0.96;
    }
  } else if (orientation === 'vertical') {
    // Relaciones nominales:
    // 2x3 -> 0.667 (Límite: (0.577, 0.85])
    // 1x2 -> 0.500 (Límite: (0.408, 0.577])
    // 1x3 -> 0.333 (Límite: <= 0.408)
    if (aspect <= 0.408) {
      size = '1x3';
      confidence = 0.93;
    } else if (aspect <= 0.577) {
      size = '1x2';
      confidence = 0.96;
    } else {
      size = '2x3';
      confidence = 0.96;
    }
  } else {
    // Orientación Cuadrada (0.85 < aspect < 1.18)
    // 2x2 (4 casillas) vs 1x1 (1 casilla)
    if (pixelCount > 240 || a > 850) {
      size = '2x2';
      confidence = 0.95;
    } else {
      size = '1x1';
      confidence = 0.92;
    }
  }

  const orientSymbol = orientation === 'horizontal' ? '↔️' : (orientation === 'vertical' ? '↕️' : '⏹️');
  const label = `[${size} ${orientSymbol}]`;

  return {
    size,
    orientation,
    aspect: Number(aspect.toFixed(3)),
    confidence,
    label
  };
}

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

  // 1. Segmentación de Cuadrícula Activa por Croma Verde (Resaltado de Inventario ABI)
  let greenPixels = 0;
  let greenMinX = canvas.width, greenMaxX = 0;
  let greenMinY = canvas.height, greenMaxY = 0;

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    // Detección de píxel de ranura iluminada en inventario
    if (g >= 55 && g > (r * 1.22) && g > (b * 1.12) && (g - r) >= 15) {
      greenPixels++;
      const x = i % canvas.width;
      const y = Math.floor(i / canvas.width);
      if (x < greenMinX) greenMinX = x;
      if (x > greenMaxX) greenMaxX = x;
      if (y < greenMinY) greenMinY = y;
      if (y > greenMaxY) greenMaxY = y;
    }
  }

  const hasActiveGridSlots = greenPixels >= 35;
  if (hasActiveGridSlots) {
    const gw = Math.max(1, greenMaxX - greenMinX);
    const gh = Math.max(1, greenMaxY - greenMinY);
    const geo = classifyGridGeometry(gw, gh, gw * gh, greenPixels);

    if (geo.size !== 'all') {
      state.vision.detectedSize = geo.size;
      state.vision.detectedOrientation = geo.orientation;
      state.vision.gridConfidence = geo.confidence;
      state.vision.greenTileCount = greenPixels;
    }
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
      const mGeo = classifyGridGeometry(boxW, boxH, boxW * boxH, changedPixels);

      if (mGeo.size !== 'all') {
        state.vision.detectedSize = mGeo.size;
        state.vision.detectedOrientation = mGeo.orientation;
        state.vision.gridConfidence = Math.max(state.vision.gridConfidence, mGeo.confidence);
      }

      if (!state.vision.isDragging) {
        state.vision.isDragging = true;
        state.vision.dragStartTimestamp = Date.now();
        if (visionDot) visionDot.className = 'vision-dot dragging';
        if (visionText) {
          const sym = state.vision.detectedOrientation === 'horizontal' ? '↔️' : (state.vision.detectedOrientation === 'vertical' ? '↕️' : '⏹️');
          visionText.textContent = `Arrastrando [${state.vision.detectedSize !== 'all' ? state.vision.detectedSize : 'Caja'} ${sym}]`;
        }
      }
    } else if (state.vision.isDragging && changedPixels < 25) {
      // EVENTO DE DROP DETECTADO: El movimiento cesó repentinamente
      const dragDuration = Date.now() - state.vision.dragStartTimestamp;
      state.vision.isDragging = false;

      if (dragDuration > 120) {
        state.vision.lastDropTimestamp = Date.now();
        const finalSize = state.vision.detectedSize;
        const finalOrient = state.vision.detectedOrientation;
        const sym = finalOrient === 'horizontal' ? '↔️' : (finalOrient === 'vertical' ? '↕️' : '⏹️');

        if (visionDot) visionDot.className = 'vision-dot drop';
        if (visionText) {
          visionText.textContent = `¡SOLTADO VISUAL [${finalSize !== 'all' ? finalSize : 'Auto'} ${sym}]!`;
        }

        // Auto-asignar tamaño y orientación de casilla al radar
        if (finalSize !== 'all') {
          state.radar.selectedSize = finalSize;
          const sizeSelect = document.getElementById('radar-size-filter');
          if (sizeSelect) sizeSelect.value = finalSize;
        }
        if (finalOrient !== 'any') {
          state.radar.selectedOrientation = finalOrient;
          const orientSelect = document.getElementById('radar-orientation-filter');
          if (orientSelect) orientSelect.value = finalOrient;
        }

        // Sincronizar evaluación acústica inmediata
        if (state.radar.pendingCapture) {
          state.radar.pendingCapture.samplesRemaining = 0;
        }

        setTimeout(() => {
          if (visionDot && state.vision.isTracking) visionDot.className = 'vision-dot active';
          if (visionText && state.vision.isTracking) {
            const curSym = state.vision.detectedOrientation === 'horizontal' ? '↔️' : (state.vision.detectedOrientation === 'vertical' ? '↕️' : '⏹️');
            visionText.textContent = `Visión: [${state.vision.detectedSize} ${curSym}] Monitoreando`;
          }
        }, 1500);
      }
    }
  }

  state.vision.prevLuma = currentLuma;
}

