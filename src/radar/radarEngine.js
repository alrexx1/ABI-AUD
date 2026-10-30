/**
 * ABI SOUND MASTER - MOTOR DEL RADAR ACÚSTICO EN VIVO
 * Captura digital de audio, procesamiento de transitorios y emparejamiento acústico.
 */

import { state } from '../core/state.js';
import { RADAR_FREQS } from '../core/constants.js';
import { extractAcousticFeatures } from '../dsp/features.js';
import { scoreTemplateSimilarity } from '../dsp/similarity.js';
import { playSynthSFX, playSoundFile } from '../audio/audioEngine.js';
import { startRadarScope } from './scopeRenderer.js';
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

  if (statusText) statusText.textContent = 'CALIBRANDO RUIDO DE FONDO DEL JUEGO (1.8s)... MANTÉN SILENCIO EN EL JUEGO';
  if (beacon) beacon.className = 'status-beacon detecting';

  state.radar.isCalibrating = true;
  const startTime = Date.now();
  const noiseRmsSamples = [];
  const noiseFreqAccum = new Float32Array(RADAR_FREQS.length);
  let accumCount = 0;

  const calInterval = setInterval(() => {
    if (!state.radar.active) {
      clearInterval(calInterval);
      state.radar.isCalibrating = false;
      return;
    }

    noiseRmsSamples.push(state.radar.currentRms);

    if (state.radar.liveBandEnergies) {
      for (let f = 0; f < RADAR_FREQS.length; f++) {
        noiseFreqAccum[f] += state.radar.liveBandEnergies[f] || 0;
      }
      accumCount++;
    }

    if (Date.now() - startTime >= 1800) {
      clearInterval(calInterval);
      state.radar.isCalibrating = false;

      let avgNoise = 0.003;
      if (noiseRmsSamples.length > 0) {
        avgNoise = noiseRmsSamples.reduce((a, b) => a + b, 0) / noiseRmsSamples.length;
      }

      if (accumCount > 0) {
        let specSum = 0;
        for (let f = 0; f < RADAR_FREQS.length; f++) {
          state.radar.noiseSpectrum[f] = noiseFreqAccum[f] / accumCount;
          specSum += state.radar.noiseSpectrum[f];
        }
        if (specSum > 0) {
          for (let f = 0; f < RADAR_FREQS.length; f++) {
            state.radar.noiseSpectrum[f] /= specSum;
          }
        }
      }

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

      setTimeout(() => {
        if (statusText && state.radar.active) {
          statusText.textContent = 'RADAR ACTIVO — ESCUCHANDO RAID (CALIBRADO DSP)';
        }
      }, 2500);
    }
  }, 60);
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
  const sizeFilter = state.radar.selectedSize || 'all';

  const eligibleTemplates = state.radar.templates.filter(tmpl => {
    if (mode === 'both' || mode === 'chain') return true;
    return tmpl.action === mode;
  });

  const scores = eligibleTemplates.map(tmpl => {
    let sim = scoreTemplateSimilarity(liveFeat, tmpl);

    if (sizeFilter !== 'all') {
      const allItems = window.ABI_DATA ? window.ABI_DATA.items : [];
      const hasMatchingRed = (tmpl.sound.redItems || []).some(r => {
        const it = allItems.find(x => x.id === r.id);
        return it && it.sizeLabel === sizeFilter;
      });
      if (hasMatchingRed) {
        sim += 0.08;
      } else {
        const hasAnyItemOfSize = (tmpl.sound.items || []).some(it => {
          const fullIt = allItems.find(x => x.id === it.id);
          return fullIt && fullIt.sizeLabel === sizeFilter;
        });
        if (!hasAnyItemOfSize) {
          sim -= 0.12;
        }
      }
    }

    return {
      sound: tmpl.sound,
      action: tmpl.action,
      score: sim
    };
  });

  const soundBestScores = new Map();
  for (const item of scores) {
    const existing = soundBestScores.get(item.sound.id);
    if (!existing || item.score > existing.score) {
      soundBestScores.set(item.sound.id, item);
    }
  }

  const uniqueRanked = Array.from(soundBestScores.values());
  uniqueRanked.sort((a, b) => b.score - a.score);

  const topMatch = uniqueRanked[0];
  const alternatives = uniqueRanked.slice(1, 4);

  let conf = Math.min(99, Math.max(72, Math.round(topMatch.score * 100)));

  if (mode === 'chain') {
    const now = Date.now();
    const last = state.radar.lastEvent;

    if (topMatch.action === 'pickup') {
      state.radar.lastEvent = { sound: topMatch.sound, action: 'pickup', time: now };
      const statusText = document.getElementById('radar-status-text');
      if (statusText) {
        statusText.textContent = `ARRASTRE DETECTADO (#${topMatch.sound.id} ${topMatch.sound.name.slice(0, 16)}) — SUELTA LA CAJA PARA CONFIRMAR...`;
      }
      return;
    } else if (topMatch.action === 'drop' && last && (now - last.time) < 3500) {
      if (last.sound.id === topMatch.sound.id) {
        conf = 99;
        state.radar.lastEvent = null;
        displayRadarVerdict(topMatch.sound, conf, alternatives, 'chain');
        return;
      }
    }
  }

  displayRadarVerdict(topMatch.sound, conf, alternatives, topMatch.action);
}

export function displayRadarVerdict(sound, confidence, alternatives = [], detectedAction = 'drop') {
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

  const allItems = window.ABI_DATA ? window.ABI_DATA.items : [];
  const sizeFilter = state.radar.selectedSize || 'all';

  const redCandidates = (sound.redItems || []).map(r => allItems.find(it => it.id === r.id)).filter(Boolean);
  const otherCandidates = (sound.items || []).map(o => allItems.find(it => it.id === o.id)).filter(it => it && !it.isRed);
  otherCandidates.sort((a, b) => (b.referencePrice || 0) - (a.referencePrice || 0));

  let representativeItem = null;

  if (sizeFilter !== 'all') {
    representativeItem = redCandidates.find(it => it.sizeLabel === sizeFilter);
    if (!representativeItem) {
      representativeItem = otherCandidates.find(it => it.sizeLabel === sizeFilter);
    }
  }

  if (!representativeItem) {
    if (redCandidates.length > 0) {
      redCandidates.sort((a, b) => b.referencePrice - a.referencePrice);
      representativeItem = redCandidates[0];
    } else if (otherCandidates.length > 0) {
      otherCandidates.sort((a, b) => b.referencePrice - a.referencePrice);
      representativeItem = otherCandidates[0];
    } else {
      representativeItem = allItems[0];
    }
  }

  let actionText = 'Soltar (Drop)';
  if (detectedAction === 'pickup') actionText = 'Arrastrar (Pickup)';
  else if (detectedAction === 'chain') actionText = '🔗 Doble Confirmación (Arrastrar ➔ Soltar)';

  if (badge) {
    if (sound.isGuaranteedRed) {
      badge.className = 'verdict-main-tag red';
      badge.textContent = '🔴 ¡ALERTA: 100% GARANTÍA ROJO!';
      playSynthSFX('success');
    } else if (sound.hasRed) {
      badge.className = 'verdict-main-tag gold';
      badge.textContent = `🟡 ALERTA: POSIBLE ROJO (${sound.redRatio}% PROBABLE)`;
      playSynthSFX('click');
    } else {
      badge.className = 'verdict-main-tag skip';
      badge.textContent = '⚪ DESCARTAR — 0% ROJO (CHATARRA)';
      playSynthSFX('fail');
    }
  }

  if (itemImg) itemImg.src = representativeItem.iconUrl;
  if (itemName) itemName.textContent = `${representativeItem.nameEs} (${representativeItem.name})`;
  if (itemPrice) itemPrice.textContent = `Valor Estimado: ~${representativeItem.referencePrice.toLocaleString()} Koens • Tamaño: ${representativeItem.sizeLabel}`;
  if (soundIdTag) soundIdTag.textContent = `Perfil Acústico #${sound.id}: ${sound.name} • Movimiento: ${actionText} • Certeza: ${confidence}%`;

  updatePiPHUD(representativeItem, sound, confidence);

  if (tipEl) {
    if (sound.isGuaranteedRed) {
      tipEl.className = 'verdict-tactical-tip red-tip';
      tipEl.innerHTML = `🔥 <strong>RECOMENDACIÓN TÁCTICA:</strong> ¡COMPRA INMEDIATA! Este perfil acústico no tiene trampas ni duplicados ordinarios.`;
    } else if (sound.hasRed) {
      tipEl.className = 'verdict-tactical-tip';
      tipEl.innerHTML = `⚠️ <strong>VERIFICACIÓN DE TAMAÑO:</strong> Este sonido contiene varios ítems. Revisa el tamaño de la caja/casilla abajo para confirmar si es el Rojo o Chatarra.`;
    } else {
      tipEl.className = 'verdict-tactical-tip';
      tipEl.innerHTML = `⚪ <strong>RECOMENDACIÓN TÁCTICA:</strong> AHORRA KOENS. Este sonido pertenece a chatarra o materiales comunes.`;
    }
  }

  if (altList) {
    const bySize = new Map();
    for (const r of redCandidates) {
      const sz = r.sizeLabel;
      if (!bySize.has(sz)) bySize.set(sz, []);
      bySize.get(sz).push({ item: r, isRed: true });
    }
    for (const o of otherCandidates) {
      const sz = o.sizeLabel;
      if (!bySize.has(sz)) bySize.set(sz, []);
      bySize.get(sz).push({ item: o, isRed: false });
    }

    altList.innerHTML = '';
    bySize.forEach((candidates, sz) => {
      const row = document.createElement('div');
      row.className = `candidate-size-group ${sizeFilter === sz ? 'highlight-active-size' : ''}`;

      const redInGroup = candidates.filter(c => c.isRed);
      const otherInGroup = candidates.filter(c => !c.isRed);
      const isPureRed = (otherInGroup.length === 0 && redInGroup.length > 0);

      let groupBadge = '';
      if (isPureRed) {
        groupBadge = '<span class="candidate-tag-badge red">100% ROJO</span>';
      } else if (redInGroup.length > 0) {
        groupBadge = '<span class="candidate-tag-badge gold">RIESGO DE TRAMPA</span>';
      } else {
        groupBadge = '<span class="candidate-tag-badge skip">0% ROJO</span>';
      }

      row.innerHTML = `
        <div class="candidate-size-header">
          <span class="candidate-size-label">Casilla [${sz}]</span>
          ${groupBadge}
        </div>
        <div class="candidate-items-sublist">
          ${candidates.map(c => `
            <div class="candidate-mini-item ${c.isRed ? 'is-red' : ''}">
              <img src="${c.item.iconUrl}" alt="" class="candidate-mini-icon" />
              <div class="candidate-mini-info">
                <div class="candidate-mini-name">${c.isRed ? '🔴' : '⚪'} ${c.item.nameEs}</div>
                <div class="candidate-mini-price">~${c.item.referencePrice.toLocaleString()} K</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      altList.appendChild(row);
    });
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
  playSoundFile(simSound.drop, simSound.name, 'Simulación de Radar');
  displayRadarVerdict(simSound, 94 + Math.floor(Math.random() * 5), [], 'drop');
}

export function clearRadarHistory() {
  const historyList = document.getElementById('radar-history-list');
  if (historyList) historyList.innerHTML = '';
}

