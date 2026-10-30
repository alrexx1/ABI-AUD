/**
 * ABI SOUND MASTER - MOTOR DEL RADAR ACÚSTICO EN VIVO
 * Captura digital de audio, procesamiento de transitorios y emparejamiento acústico.
 */

import { state } from '../core/state.js';
import { RADAR_FREQS } from '../core/constants.js';
import { extractAcousticFeatures } from '../dsp/features.js';
import { scoreTemplateSimilarity } from '../dsp/similarity.js';
import { updateNoiseFloorMovingAverage } from '../dsp/goertzel.js';
import { computeBayesianVerdict } from './bayesEngine.js';
import { playSynthSFX, playSoundFile } from '../audio/audioEngine.js';
import { startRadarScope } from './scopeRenderer.js';
import { pushReplayAudioChunk } from './replayEngine.js';
import { startVisionTracking, stopVisionTracking } from '../vision/visionEngine.js';
import { updatePiPHUD } from '../ui/pipOverlay.js';

export async function preloadRadarTemplates() {
  if (state.radar.templatesLoaded || state.radar.isPreloading) return;
  state.radar.isPreloading = true;

  const statusEl = document.getElementById('radar-status-text');
  if (statusEl) statusEl.textContent = 'CARGANDO 76 FIRMAS ACÚSTICAS (0ms DSP)...';

  try {
    const resp = await fetch('radar_signatures.json');
    if (resp.ok) {
      const precompiled = await resp.json();
      state.radar.templates = precompiled.map(t => ({
        ...t,
        slice1: new Float32Array(t.slice1),
        slice2: new Float32Array(t.slice2),
        slice3: new Float32Array(t.slice3),
        env16: new Float32Array(t.env16),
        vector: new Float32Array(t.vector)
      }));
      state.radar.templatesLoaded = true;
      state.radar.isPreloading = false;
      if (statusEl) {
        statusEl.textContent = state.radar.active ? 'RADAR ACTIVO — ESCUCHANDO RAID (DSP ALTA PRECISIÓN)' : 'RADAR LISTO (76 FIRMAS INSTANTÁNEAS) — HAZ CLIC EN ACTIVAR';
      }
      return;
    }
  } catch (e) {
    console.warn('[Radar] Fallback a decodificación dinámica de audio:', e);
  }

  // Fallback dinámico
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const tempCtx = new AudioCtx();
  const sounds = window.ABI_DATA ? window.ABI_DATA.sounds : [];

  for (const sound of sounds) {
    try {
      const respDrop = await fetch(`audio/${sound.drop}.ogg`);
      const abDrop = await respDrop.arrayBuffer();
      const bufDrop = await tempCtx.decodeAudioData(abDrop);
      const featDrop = extractAcousticFeatures(bufDrop.getChannelData(0), bufDrop.sampleRate, null);
      state.radar.templates.push({
        sound,
        action: 'drop',
        file: sound.drop,
        ...featDrop
      });
    } catch (err) {
      console.warn('Error precargando drop:', sound.drop, err);
    }

    try {
      const respUp = await fetch(`audio/${sound.pickup}.ogg`);
      const abUp = await respUp.arrayBuffer();
      const bufUp = await tempCtx.decodeAudioData(abUp);
      const featUp = extractAcousticFeatures(bufUp.getChannelData(0), bufUp.sampleRate, null);
      state.radar.templates.push({
        sound,
        action: 'pickup',
        file: sound.pickup,
        ...featUp
      });
    } catch (err) {
      console.warn('Error precargando pickup:', sound.pickup, err);
    }
  }

  state.radar.templatesLoaded = true;
  state.radar.isPreloading = false;
  if (statusEl) {
    statusEl.textContent = state.radar.active ? 'RADAR ACTIVO — ESCUCHANDO RAID (DSP ALTA PRECISIÓN)' : 'RADAR LISTO (76 FIRMAS) — HAZ CLIC EN ACTIVAR';
  }
}

export async function autoCalibrateRadarNoise() {
  if (!state.radar.active) {
    alert('Activa primero el radar acústico para poder medir el ruido de fondo de tu juego.');
    return;
  }

  const statusText = document.getElementById('radar-status-text');
  const beacon = document.getElementById('radar-beacon');

  if (statusText) statusText.textContent = 'CALIBRANDO RUIDO DE FONDO (2.0s)... MANTÉN SILENCIO EN EL JUEGO';
  if (beacon) beacon.className = 'status-beacon detecting';

  state.radar.isCalibrating = true;
  const startTime = Date.now();
  const calTotalDuration = 2000;
  const noiseRmsSamples = [];
  const noiseFreqAccum = new Float32Array(RADAR_FREQS.length);
  let accumCount = 0;

  const calInterval = setInterval(() => {
    if (!state.radar.active) {
      clearInterval(calInterval);
      state.radar.isCalibrating = false;
      return;
    }

    const elapsed = Date.now() - startTime;
    const remainingSec = Math.max(0, ((calTotalDuration - elapsed) / 1000)).toFixed(1);
    if (statusText) {
      statusText.textContent = `CALIBRANDO PERFIL DE RUIDO (${remainingSec}s)... MANTÉN SILENCIO`;
    }

    noiseRmsSamples.push(state.radar.currentRms);

    if (state.radar.liveBandEnergies) {
      for (let f = 0; f < RADAR_FREQS.length; f++) {
        noiseFreqAccum[f] += state.radar.liveBandEnergies[f] || 0;
      }
      accumCount++;
    }

    if (elapsed >= calTotalDuration) {
      clearInterval(calInterval);
      state.radar.isCalibrating = false;

      let avgNoise = 0.003;
      if (noiseRmsSamples.length > 0) {
        avgNoise = noiseRmsSamples.reduce((a, b) => a + b, 0) / noiseRmsSamples.length;
      }

      if (accumCount > 0) {
        let specSum = 0;
        for (let f = 0; f < RADAR_FREQS.length; f++) {
          const meanBandEnergy = noiseFreqAccum[f] / accumCount;
          state.radar.noiseSpectrumAbs[f] = meanBandEnergy;
          state.radar.noiseSpectrum[f] = meanBandEnergy;
          specSum += meanBandEnergy;
        }
        if (specSum > 0) {
          for (let f = 0; f < RADAR_FREQS.length; f++) {
            state.radar.noiseSpectrum[f] /= specSum;
          }
        }
      }

      state.radar.noiseSubtractionEnabled = true;
      state.radar.movingAvgRms = avgNoise;
      const optThreshold = Math.min(0.050, Math.max(0.005, Number((avgNoise * 2.2 + 0.003).toFixed(3))));
      state.radar.threshold = optThreshold;

      const sliderThreshold = document.getElementById('radar-threshold-slider');
      const valThreshold = document.getElementById('radar-threshold-val');
      const markerThreshold = document.getElementById('radar-threshold-marker');
      const presetSelect = document.getElementById('radar-sensitivity-preset');

      if (sliderThreshold) sliderThreshold.value = optThreshold;
      if (presetSelect) presetSelect.value = 'custom';

      const pct = Math.max(0, Math.min(100, ((optThreshold - 0.003) / (0.060 - 0.003)) * 100));
      if (markerThreshold) markerThreshold.style.left = `${pct}%`;
      if (valThreshold) valThreshold.textContent = `${optThreshold.toFixed(3)} (Auto-Calibrado: Ruido ${avgNoise.toFixed(3)})`;

      if (statusText) statusText.textContent = `CALIBRADO CON ÉXITO: Umbral ${optThreshold.toFixed(3)} • Sustracción de Ruido DSP Activa`;
      if (beacon) beacon.className = 'status-beacon active';
      playSynthSFX('success');

      updateNoiseFilterBadge();

      setTimeout(() => {
        if (statusText && state.radar.active) {
          statusText.textContent = 'RADAR ACTIVO — ESCUCHANDO RAID (CALIBRADO DSP)';
        }
      }, 2500);
    }
  }, 60);
}

export function toggleNoiseSubtraction(forceState = null) {
  state.radar.noiseSubtractionEnabled = (forceState !== null) ? forceState : !state.radar.noiseSubtractionEnabled;
  updateNoiseFilterBadge();
  playSynthSFX('click');
}

function updateNoiseFilterBadge() {
  const badge = document.getElementById('radar-noise-filter-badge');
  if (badge) {
    const isAct = state.radar.noiseSubtractionEnabled;
    badge.classList.toggle('active', isAct);
    badge.textContent = isAct ? 'Filtro Sustractivo: ACTIVO' : 'Filtro Sustractivo: OFF';
  }
}
}

export async function toggleRadarCapture() {
  playSynthSFX('click');
  const toggleBtn = document.getElementById('btn-toggle-radar');
  const toggleText = document.getElementById('btn-toggle-radar-text');
  const beacon = document.getElementById('radar-beacon');
  const statusText = document.getElementById('radar-status-text');
  const rateInfo = document.getElementById('radar-rate-info');

  if (state.radar.active) {
    if (state.radar.stream) {
      state.radar.stream.getTracks().forEach(t => t.stop());
      state.radar.stream = null;
    }
    if (state.radar.sourceNode) {
      state.radar.sourceNode.disconnect();
      state.radar.sourceNode = null;
    }
    if (state.radar.gainNode) {
      state.radar.gainNode.disconnect();
      state.radar.gainNode = null;
    }
    if (state.radar.workletNode) {
      state.radar.workletNode.disconnect();
      state.radar.workletNode = null;
    }
    if (state.radar.scriptNode) {
      state.radar.scriptNode.disconnect();
      state.radar.scriptNode = null;
    }
    if (state.radar.silentGain) {
      state.radar.silentGain.disconnect();
      state.radar.silentGain = null;
    }
    if (state.vision.isTracking) {
      stopVisionTracking();
    }
    state.radar.active = false;
    state.radar.pendingCapture = null;

    if (toggleBtn) toggleBtn.classList.remove('active');
    if (toggleText) toggleText.textContent = 'ACTIVAR RADAR ACÚSTICO';
    if (beacon) beacon.className = 'status-beacon inactive';
    if (statusText) statusText.textContent = 'RADAR DETENIDO';
    return;
  }

  if (!state.radar.templatesLoaded) {
    await preloadRadarTemplates();
  }

  try {
    let stream = null;
    const mode = state.radar.sourceMode;

    if (mode === 'system') {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Tu navegador no soporta captura de audio del sistema. Usa la opción de Micrófono / Mezcla Estéreo.');
        return;
      }
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(t => t.stop());
        alert('IMPORTANTE: Al compartir pantalla, debes marcar la casilla "Compartir también el audio del sistema" para que el radar pueda escuchar el juego.');
        return;
      }

      if (state.vision.mode === 'auto') {
        startVisionTracking(stream);
      } else {
        stream.getVideoTracks().forEach(t => t.stop());
      }
    } else {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Tu navegador no tiene acceso a dispositivos de audio.');
        return;
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
    }

    state.radar.stream = stream;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!state.radar.audioContext) {
      state.radar.audioContext = new AudioCtx();
    }
    if (state.radar.audioContext.state === 'suspended') {
      await state.radar.audioContext.resume();
    }

    state.radar.sourceNode = state.radar.audioContext.createMediaStreamSource(stream);

    state.radar.gainNode = state.radar.audioContext.createGain();
    state.radar.gainNode.gain.value = state.radar.gainBoost;

    state.radar.analyserNode = state.radar.audioContext.createAnalyser();
    state.radar.analyserNode.fftSize = 2048;
    state.radar.analyserNode.smoothingTimeConstant = 0.08;

    state.radar.sourceNode.connect(state.radar.gainNode);
    state.radar.gainNode.connect(state.radar.analyserNode);

    const scriptNode = state.radar.audioContext.createScriptProcessor(2048, 1, 1);
    const silentGain = state.radar.audioContext.createGain();
    silentGain.gain.value = 0;

    state.radar.gainNode.connect(scriptNode);
    scriptNode.connect(silentGain);
    silentGain.connect(state.radar.audioContext.destination);

    state.radar.scriptNode = scriptNode;
    state.radar.silentGain = silentGain;

    state.radar.active = true;
    state.radar.movingAvgRms = 0.003;
    state.radar.ringWriteIdx = 0;
    state.radar.pendingCapture = null;

    scriptNode.onaudioprocess = (e) => {
      if (!state.radar.active) return;
      const inputData = e.inputBuffer.getChannelData(0);

      // 1. Alimentar el buffer forense de replay continuo de 5s
      pushReplayAudioChunk(inputData);

      const ring = state.radar.ringBuffer;
      const ringLen = ring.length;
      let wIdx = state.radar.ringWriteIdx;
      for (let i = 0; i < inputData.length; i++) {
        ring[(wIdx + i) % ringLen] = inputData[i];
      }
      state.radar.ringWriteIdx = (wIdx + inputData.length) % ringLen;

      let sumSq = 0;
      for (let i = 0; i < inputData.length; i++) {
        const v = inputData[i];
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / inputData.length);
      state.radar.currentRms = rms;

      let stSumSq = 0;
      const stCount = 256;
      for (let i = 0; i < stCount; i++) {
        const s = inputData[inputData.length - 1 - i];
        stSumSq += s * s;
      }
      const shortRms = Math.sqrt(stSumSq / stCount);

      if (!state.radar.isCalibrating && !state.radar.pendingCapture) {
        state.radar.movingAvgRms = (state.radar.movingAvgRms * 0.94) + (rms * 0.06);
        // Puerta de ruido espectral adaptativa durante silencio de raid
        if (rms < state.radar.threshold * 0.35 && state.radar.liveBandEnergies) {
          updateNoiseFloorMovingAverage(state.radar.noiseSpectrum, state.radar.liveBandEnergies, 0.03);
        }
      }

      const now = Date.now();

      if (state.radar.pendingCapture) {
        state.radar.pendingCapture.samplesRemaining -= inputData.length;
        if (state.radar.pendingCapture.samplesRemaining <= 0) {
          const trigIdx = state.radar.pendingCapture.triggerIdx;
          state.radar.pendingCapture = null;
          state.radar.cooldownUntil = now + 400;

          const analysisLen = 8192;
          const preTrigger = 2048;
          const analysisBuffer = new Float32Array(analysisLen);
          const readStart = (trigIdx - preTrigger + ringLen) % ringLen;

          for (let i = 0; i < analysisLen; i++) {
            analysisBuffer[i] = ring[(readStart + i) % ringLen];
          }

          const sampleRate = state.radar.audioContext.sampleRate || 48000;
          const liveFeat = extractAcousticFeatures(analysisBuffer, sampleRate, state.radar.noiseSpectrum);
          matchLiveRadarFeatures(liveFeat);
        }
        return;
      }

      const isDynamicSpike = (shortRms > state.radar.movingAvgRms * 1.80 && shortRms >= 0.005);
      const isAbsoluteThreshold = (rms >= state.radar.threshold || shortRms >= state.radar.threshold);

      if ((isDynamicSpike || isAbsoluteThreshold) && now > state.radar.cooldownUntil && state.radar.templatesLoaded && !state.radar.isCalibrating) {
        state.radar.pendingCapture = {
          triggerIdx: state.radar.ringWriteIdx,
          samplesRemaining: 5120
        };

        const b = document.getElementById('radar-beacon');
        const st = document.getElementById('radar-status-text');
        if (b) b.className = 'status-beacon detecting';
        if (st) st.textContent = '¡CAPTANDO HUELLA EN CURSO...! (DSP)';

        setTimeout(() => {
          if (b && state.radar.active) b.className = 'status-beacon active';
          if (st && state.radar.active) st.textContent = 'RADAR ACTIVO — ESCUCHANDO RAID (DSP CONTINUO)';
        }, 500);
      }
    };

    if (toggleBtn) toggleBtn.classList.add('active');
    if (toggleText) toggleText.textContent = 'DETENER RADAR';
    if (beacon) beacon.className = 'status-beacon active';
    if (statusText) statusText.textContent = 'RADAR ACTIVO — ESCUCHANDO RAID (DSP CONTINUO)';
    if (rateInfo) rateInfo.textContent = `${(state.radar.audioContext.sampleRate / 1000).toFixed(1)} kHz • DSP x${state.radar.gainBoost}`;

    startRadarScope();

    const primaryAudioTrack = stream.getAudioTracks()[0];
    if (primaryAudioTrack) {
      primaryAudioTrack.onended = () => {
        if (state.radar.active) toggleRadarCapture();
      };
    }
    const primaryVideoTrack = stream.getVideoTracks()[0];
    if (primaryVideoTrack) {
      primaryVideoTrack.onended = () => {
        if (state.vision.isTracking) stopVisionTracking();
      };
    }

  } catch (err) {
    console.warn('[Radar] Error al iniciar captura:', err);
    if (err.name !== 'NotAllowedError') {
      alert(`No se pudo conectar el audio: ${err.message || err.name}`);
    }
    state.radar.active = false;
    if (beacon) beacon.className = 'status-beacon inactive';
    if (statusText) statusText.textContent = 'ERROR DE CAPTURA';
  }
}

export function matchLiveRadarFeatures(liveFeat) {
  if (!state.radar.templates || state.radar.templates.length === 0) return;

  const mode = state.radar.detectMode || 'both';
  const sizeFilter = (state.vision.detectedSize && state.vision.detectedSize !== 'all')
    ? state.vision.detectedSize
    : (state.radar.selectedSize || 'all');
  const gridConfidence = state.vision.gridConfidence || 0.70;
  const boxPrice = state.radar.boxPrice || null;

  const eligibleTemplates = state.radar.templates.filter(tmpl => {
    if (mode === 'both' || mode === 'chain') return true;
    return tmpl.action === mode;
  });

  // FUSIÓN BAYESIANA MULTIMODAL (Física Acústica + Tamaño + Precio de Caja)
  const bayesVerdict = computeBayesianVerdict(
    liveFeat,
    eligibleTemplates,
    sizeFilter,
    gridConfidence,
    boxPrice
  );

  if (!bayesVerdict) return;

  if (mode === 'chain') {
    const now = Date.now();
    const last = state.radar.lastEvent;

    if (bayesVerdict.topAction === 'pickup') {
      state.radar.lastEvent = { sound: bayesVerdict.topSound, action: 'pickup', time: now };
      const statusText = document.getElementById('radar-status-text');
      if (statusText) {
        statusText.textContent = `ARRASTRE DETECTADO (#${bayesVerdict.topSound.id} ${bayesVerdict.topSound.name.slice(0, 16)}) — SUELTA LA CAJA PARA CONFIRMAR...`;
      }
      return;
    } else if (bayesVerdict.topAction === 'drop' && last && (now - last.time) < 3500) {
      if (last.sound.id === bayesVerdict.topSound.id) {
        bayesVerdict.confidence = 99;
        state.radar.lastEvent = null;
        displayRadarVerdict(bayesVerdict, 'chain');
        return;
      }
    }
  }

  displayRadarVerdict(bayesVerdict, bayesVerdict.topAction);
}

export function displayRadarVerdict(verdict, detectedAction = 'drop') {
  const idleState = document.getElementById('verdict-idle-state');
  const activeState = document.getElementById('verdict-active-state');
  const badge = document.getElementById('verdict-badge');
  const itemImg = document.getElementById('verdict-item-img');
  const itemName = document.getElementById('verdict-item-name');
  const itemPrice = document.getElementById('verdict-item-price');
  const soundIdTag = document.getElementById('verdict-sound-id');
  const tipEl = document.getElementById('verdict-tactical-tip');
  const altList = document.getElementById('verdict-candidates-list');

  if (idleState) idleState.style.display = 'none';
  if (activeState) activeState.style.display = 'flex';

  const representativeItem = verdict.topItem;
  const sound = verdict.topSound;
  const confidence = verdict.confidence;
  const sizeFilter = (state.vision.detectedSize && state.vision.detectedSize !== 'all') ? state.vision.detectedSize : state.radar.selectedSize;

  let actionText = 'Soltar (Drop)';
  if (detectedAction === 'pickup') actionText = 'Arrastrar (Pickup)';
  else if (detectedAction === 'chain') actionText = '🔗 Doble Confirmación (Arrastrar ➔ Soltar)';

  if (badge) {
    if (verdict.isGuaranteedRed || verdict.pRed >= 88) {
      badge.className = 'verdict-main-tag red';
      badge.textContent = `🔴 ¡ALERTA: ROJO CONFIRMADO (${verdict.pRed}% BAYESIANO)!`;
      playSynthSFX('success');
    } else if (verdict.pRed >= 25) {
      badge.className = 'verdict-main-tag gold';
      badge.textContent = `🟡 ALERTA: POSIBLE ROJO (${verdict.pRed}% PROBABILIDAD)`;
      playSynthSFX('click');
    } else {
      badge.className = 'verdict-main-tag skip';
      badge.textContent = `⚪ DESCARTAR — 0% ROJO (${verdict.pJunk}% CHATARRA)`;
      playSynthSFX('fail');
    }
  }

  if (itemImg) itemImg.src = representativeItem.iconUrl;
  if (itemName) itemName.textContent = `${representativeItem.nameEs} (${representativeItem.name})`;
  if (itemPrice) itemPrice.textContent = `Valor Estimado: ~${representativeItem.referencePrice.toLocaleString()} Koens • Casilla: ${representativeItem.sizeLabel}`;
  if (soundIdTag) {
    soundIdTag.textContent = `Perfil #${sound.id}: ${sound.name} • T60: ${verdict.t60Measured}ms • Factor Q: ${verdict.qFactorMeasured} • Cuadrícula: [${verdict.gridDetected}] (${verdict.gridConfidence}% certeza)`;
  }

  updatePiPHUD(representativeItem, sound, confidence);

  if (tipEl) {
    if (verdict.pRed >= 88) {
      tipEl.className = 'verdict-tactical-tip red-tip';
      tipEl.innerHTML = `🔥 <strong>INFERENCIA BAYESIANA:</strong> ¡COMPRA INMEDIATA! Resonancia física ($T_{60}=${verdict.t60Measured}$ms) y cuadrícula [${representativeItem.sizeLabel}] confirman con <strong>${verdict.pRed}%</strong> de certeza que la caja contiene este ítem rojo.`;
    } else if (verdict.pRed >= 25) {
      tipEl.className = 'verdict-tactical-tip';
      tipEl.innerHTML = `⚠️ <strong>VERIFICACIÓN DE TRAMPA:</strong> Probabilidad roja del ${verdict.pRed}%. Revisa que la caja coincida con el tamaño <strong>[${representativeItem.sizeLabel}]</strong> para descartar la trampa dorada/morada.`;
    } else {
      tipEl.className = 'verdict-tactical-tip';
      tipEl.innerHTML = `⚪ <strong>RECOMENDACIÓN TÁCTICA:</strong> AHORRA KOENS (${verdict.pJunk}% certeza chatarra). El decaimiento rápido (${verdict.t60Measured}ms) descarta metales finos y porcelana.`;
    }
  }

  if (altList) {
    altList.innerHTML = '';
    const candList = verdict.candidates || [];

    const row = document.createElement('div');
    row.className = 'candidate-size-group highlight-active-size';

    let groupBadge = verdict.pRed >= 88
      ? '<span class="candidate-tag-badge red">100% ROJO</span>'
      : verdict.pRed >= 25
        ? '<span class="candidate-tag-badge gold">RIESGO DE TRAMPA</span>'
        : '<span class="candidate-tag-badge skip">0% ROJO</span>';

    row.innerHTML = `
      <div class="candidate-size-header">
        <span class="candidate-size-label">Distribución Posterior Bayesiana</span>
        ${groupBadge}
      </div>
      <div class="candidate-items-sublist">
        ${candList.map(c => `
          <div class="candidate-mini-item ${c.item.isRed ? 'is-red' : ''}" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.4rem 0.6rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <img src="${c.item.iconUrl}" alt="" class="candidate-mini-icon" style="width: 28px; height: 28px; object-fit: contain;" />
              <div>
                <div class="candidate-mini-name">${c.item.isRed ? '🔴' : '⚪'} ${c.item.nameEs} <small style="color: var(--text-dim);">[${c.item.sizeLabel}]</small></div>
                <div class="candidate-mini-price">~${c.item.referencePrice.toLocaleString()} K</div>
              </div>
            </div>
            <div style="font-family: var(--font-mono); font-weight: 700; color: ${c.item.isRed ? 'var(--rarity-red)' : 'var(--accent-gold)'};">
              ${Math.round(c.posterior * 100)}%
            </div>
          </div>
        `).join('')}
      </div>
    `;
    altList.appendChild(row);
  }

  // Registrar en el historial de sesión
  const historyList = document.getElementById('radar-history-list');
  if (historyList) {
    const timeStr = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'radar-history-entry';
    entry.innerHTML = `
      <span class="history-time">${timeStr}</span>
      <span class="history-badge ${sound.isGuaranteedRed ? 'red' : (sound.hasRed ? 'gold' : 'gray')}">${sound.isGuaranteedRed ? 'ROJO' : (sound.hasRed ? 'PROBABLE' : 'CHATARRA')}</span>
      <span class="history-name">${representativeItem.nameEs} [${representativeItem.sizeLabel}]</span>
      <span class="history-conf">${confidence}%</span>
    `;
    historyList.prepend(entry);
  }
}

export function simulateRadarDrop() {
  const sounds = window.ABI_DATA ? window.ABI_DATA.sounds : [];
  if (!sounds.length) return;

  const simSound = sounds[Math.floor(Math.random() * sounds.length)];
  playSoundFile(simSound.drop, simSound.name, 'Simulación de Radar Táctico');

  if (state.radar.templates && state.radar.templates.length > 0) {
    const matchingTmpl = state.radar.templates.find(t => t.sound.id === simSound.id && t.action === 'drop') || state.radar.templates[0];
    const syntheticFeat = {
      slice1: matchingTmpl.slice1,
      slice2: matchingTmpl.slice2,
      slice3: matchingTmpl.slice3,
      vector: matchingTmpl.vector,
      env16: matchingTmpl.env16,
      centroid: matchingTmpl.centroid,
      highRatio: matchingTmpl.highRatio,
      dominantFreq: matchingTmpl.dominantFreq,
      t60: matchingTmpl.t60 || 250,
      qFactor: matchingTmpl.qFactor || 8.5
    };
    const verdict = computeBayesianVerdict(syntheticFeat, state.radar.templates, state.radar.selectedSize || 'all', 0.88, null);
    if (verdict) {
      displayRadarVerdict(verdict, 'drop');
      return;
    }
  }
}

export function clearRadarHistory() {
  const historyList = document.getElementById('radar-history-list');
  if (historyList) historyList.innerHTML = '';
}

