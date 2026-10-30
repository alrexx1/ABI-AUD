/**
 * ABI SOUND MASTER - MOTOR DE AUDIO Y SINTETIZADOR SFX
 * Gestión del ciclo de vida de AudioContext, reproducción HTML5 Audio y visualizador Canvas.
 */

import { state } from '../core/state.js';

/**
 * Inicializa o reanuda el contexto global de audio
 */
export function initAudioContext() {
  if (!state.audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      state.audioContext = new AudioCtx();
      state.analyserNode = state.audioContext.createAnalyser();
      state.analyserNode.fftSize = 64;
      startVisualizerLoop();
    }
  }
  if (state.audioContext && state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }
  return state.audioContext;
}

/**
 * Reproduce un archivo de audio oficial (.ogg) del directorio audio/
 */
export function playSoundFile(filename, title = '', subtitle = '') {
  if (!filename) return;
  initAudioContext();

  if (state.currentAudio) {
    state.currentAudio.pause();
    state.currentAudio.currentTime = 0;
  }

  const audioUrl = `audio/${filename}.ogg`;
  const audio = new Audio(audioUrl);
  audio.volume = state.masterVolume;
  state.currentAudio = audio;

  // Actualizar HUD
  const hudTitle = document.getElementById('hud-audio-title');
  const hudDesc = document.getElementById('hud-audio-desc');
  const hudDot = document.getElementById('audio-status-dot');

  if (hudTitle) hudTitle.textContent = title || filename;
  if (hudDesc) hudDesc.textContent = subtitle || 'Reproduciendo sonido acústico...';
  if (hudDot) hudDot.classList.add('playing');

  // Conectar a Analyser para el visualizador
  try {
    if (state.audioContext && !audio.hasConnectedNode) {
      const source = state.audioContext.createMediaElementSource(audio);
      source.connect(state.analyserNode);
      state.analyserNode.connect(state.audioContext.destination);
      audio.hasConnectedNode = true;
    }
  } catch (e) {
    // Si ya estaba conectado o hay restricción CORS
  }

  audio.play().catch(err => {
    console.warn('[AudioEngine] Error al reproducir audio:', err);
  });

  audio.onended = () => {
    if (hudDot) hudDot.classList.remove('playing');
  };
}

/**
 * Reproduce la secuencia completa: Pickup (arrastrar) y luego Drop (soltar)
 */
export function playAudioCycle(pickupFile, dropFile, title = '') {
  if (!pickupFile && !dropFile) return;
  playSoundFile(pickupFile, title, 'Arrastrando ítem (Pickup)...');

  if (dropFile) {
    setTimeout(() => {
      playSoundFile(dropFile, title, 'Soltando en inventario (Drop)...');
    }, 500);
  }
}

/**
 * Sintetizador Web Audio para SFX de interfaz (clics tácticos, aciertos, fallos)
 */
export function playSynthSFX(type) {
  if (!state.sfxEnabled) return;
  initAudioContext();
  if (!state.audioContext) return;

  const ctx = state.audioContext;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === 'click') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === 'success') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  } else if (type === 'fail') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(140, now + 0.15);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}

/**
 * Visualizador Canvas en tiempo real (Barras de espectro en cabecera)
 */
export function startVisualizerLoop() {
  const canvas = document.getElementById('visualizer-canvas');
  if (!canvas || !state.analyserNode) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bufferLength = state.analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);
    state.analyserNode.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      const r = Math.min(255, 180 + dataArray[i]);
      const g = Math.max(0, 150 - dataArray[i]);
      const b = 20;

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
      x += barWidth;
    }
  }
  draw();
}

