/**
 * ABI SOUND MASTER - REPLAY ENGINE Y BUFFER CIRCULAR DE AUDIO FORENSE
 * Buffer FIFO en memoria de 5 segundos a 48 kHz para repetición instantánea en cámara lenta (0.5x / 0.25x)
 * y exportación forense en WAV de 16 bits sin pérdidas.
 */

import { state } from '../core/state.js';
import { playSynthSFX } from '../audio/audioEngine.js';

// 5.0 segundos a 48000 Hz = 240,000 muestras Float32 (~960 KB en memoria RAM)
const REPLAY_DURATION_SEC = 5.0;
const MAX_REPLAY_SAMPLES = 48000 * REPLAY_DURATION_SEC;
const replayRingBuffer = new Float32Array(MAX_REPLAY_SAMPLES);
let replayWriteIndex = 0;
let totalRecordedSamples = 0;
let activeSourceNode = null;

/**
 * Empuja un fragmento PCM recién capturado en el buffer circular
 * @param {Float32Array} chunk 
 */
export function pushReplayAudioChunk(chunk) {
  if (!chunk || chunk.length === 0) return;
  const len = chunk.length;
  for (let i = 0; i < len; i++) {
    replayRingBuffer[(replayWriteIndex + i) % MAX_REPLAY_SAMPLES] = chunk[i];
  }
  replayWriteIndex = (replayWriteIndex + len) % MAX_REPLAY_SAMPLES;
  totalRecordedSamples = Math.min(MAX_REPLAY_SAMPLES, totalRecordedSamples + len);
}

/**
 * Reproduce los últimos N segundos del buffer con velocidad variable (1.0x, 0.5x, 0.25x)
 * @param {number} speed - 1.0 (normal), 0.5 (cámara lenta), 0.25 (ultra lenta)
 * @param {number} durationSec - Duración a rebobinar (por defecto 3.8s)
 */
export function playRecentReplay(speed = 1.0, durationSec = 3.8) {
  if (totalRecordedSamples < 4800) {
    alert('Aún no hay suficiente audio capturado en el radar para generar un replay. Deja el radar activo unos segundos.');
    return;
  }

  // Detener cualquier reproducción en curso
  stopActiveReplay();

  playSynthSFX('click');

  const sampleRate = (state.radar.audioContext && state.radar.audioContext.sampleRate) || 48000;
  const samplesToExtract = Math.min(totalRecordedSamples, Math.round(sampleRate * durationSec));
  const audioCtx = state.radar.audioContext || new (window.AudioContext || window.webkitAudioContext)();

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const audioBuf = audioCtx.createBuffer(1, samplesToExtract, sampleRate);
  const channelData = audioBuf.getChannelData(0);

  const startReadIdx = (replayWriteIndex - samplesToExtract + MAX_REPLAY_SAMPLES) % MAX_REPLAY_SAMPLES;
  for (let i = 0; i < samplesToExtract; i++) {
    channelData[i] = replayRingBuffer[(startReadIdx + i) % MAX_REPLAY_SAMPLES];
  }

  const source = audioCtx.createBufferSource();
  source.buffer = audioBuf;
  source.playbackRate.value = speed;

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 1.0;

  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  activeSourceNode = source;

  updateReplayUIState(true, speed);

  source.onended = () => {
    activeSourceNode = null;
    updateReplayUIState(false);
  };

  source.start(0);
}

/**
 * Detiene la reproducción actual si está activa
 */
export function stopActiveReplay() {
  if (activeSourceNode) {
    try {
      activeSourceNode.stop();
      activeSourceNode.disconnect();
    } catch (_) {}
    activeSourceNode = null;
    updateReplayUIState(false);
  }
}

/**
 * Actualiza el indicador visual en el HUD del radar
 */
function updateReplayUIState(isPlaying, speed = 1.0) {
  const statusEl = document.getElementById('replay-status-indicator');
  const waveAnim = document.getElementById('replay-wave-anim');

  if (statusEl) {
    if (isPlaying) {
      statusEl.textContent = `▶ REPLAY EN CURSO (${speed}x)...`;
      statusEl.classList.add('playing');
    } else {
      statusEl.textContent = 'BUFFER LISTO (5s)';
      statusEl.classList.remove('playing');
    }
  }

  if (waveAnim) {
    waveAnim.style.display = isPlaying ? 'flex' : 'none';
  }
}

/**
 * Exporta el audio de los últimos N segundos como archivo .WAV estándar sin pérdidas (16-bit PCM)
 * @param {number} durationSec 
 */
export function downloadReplayWav(durationSec = 4.0) {
  if (totalRecordedSamples < 4800) {
    alert('No hay suficiente audio capturado para exportar.');
    return;
  }

  playSynthSFX('success');

  const sampleRate = (state.radar.audioContext && state.radar.audioContext.sampleRate) || 48000;
  const numSamples = Math.min(totalRecordedSamples, Math.round(sampleRate * durationSec));
  const startReadIdx = (replayWriteIndex - numSamples + MAX_REPLAY_SAMPLES) % MAX_REPLAY_SAMPLES;

  // Cabecera RIFF WAV (44 bytes) + Datos PCM (numSamples * 2 bytes)
  const byteRate = sampleRate * 2;
  const blockAlign = 2;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF chunk
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeAscii(view, 8, 'WAVE');

  // fmt subchunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM lineal
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16 bits por muestra

  // data subchunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Muestras PCM de 16 bits cuantizadas
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, replayRingBuffer[(startReadIdx + i) % MAX_REPLAY_SAMPLES]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  const now = new Date();
  const timeStr = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
  link.download = `ABI_Sound_Replay_${timeStr}.wav`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
}

function writeAscii(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
