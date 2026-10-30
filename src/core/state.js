/**
 * ABI SOUND MASTER - GESTOR DE ESTADO REACTIVO
 * Estado global centralizado con persistencia segura en LocalStorage y patrón de eventos.
 */

const STORAGE_KEY = 'abi_sound_master_stats';

export const state = {
  currentTab: 'trainer',
  audioContext: null,
  analyserNode: null,
  currentAudio: null,
  audioSourceNode: null,
  masterVolume: 0.8,
  sfxEnabled: true,
  visualizerActive: false,

  // Estado del Entrenador (Trainer / Quiz)
  trainer: {
    round: 1,
    currentMystery: null,
    isRevealed: false,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    totalCount: 0,
    virtualKoens: 0,
    tierFilter: 'high',
    sizeFilter: 'all'
  },

  // Estado del Asistente de Raid
  assistant: {
    selectedSize: 'all',
    selectedPrice: 'all',
    selectedCategory: 'all',
    onlyReds: true
  },

  // Estado de la Enciclopedia
  encyclopedia: {
    searchQuery: '',
    activeCategory: 'all'
  },

  // Estado del Comparador A/B
  compare: {
    currentPreset: 'lion_vs_cheetah'
  },

  // Estado del Radar Acústico en Vivo
  radar: {
    active: false,
    sourceMode: 'system',
    gainBoost: 4.0,
    detectMode: 'both', // 'both', 'chain', 'drop', 'pickup'
    selectedSize: 'all',
    sensitivityPreset: 'ultra',
    scopeMode: 'waterfall', // 'waterfall', 'split', 'scope'
    stream: null,
    audioContext: null,
    sourceNode: null,
    gainNode: null,
    analyserNode: null,
    workletNode: null,
    scriptNode: null,
    silentGain: null,
    threshold: 0.008,
    movingAvgRms: 0.002,
    currentRms: 0,
    cooldownUntil: 0,
    pendingCapture: null,
    templates: [],
    templatesLoaded: false,
    isPreloading: false,
    history: [],
    animationId: null,
    sweepAngle: 0,
    simIndex: 0,
    ringBuffer: new Float32Array(65536),
    ringWriteIdx: 0,
    isCalibrating: false,
    lastEvent: null,
    noiseSpectrum: new Float32Array(24),
    noiseSpectrumAbs: new Float32Array(24),
    noiseSubtractionEnabled: true,
    liveBandEnergies: new Float32Array(24),
    liveBandPeaks: new Float32Array(24)
  },

  // Estado del Motor de Visión Multimodal (Pantalla + HUD PiP)
  vision: {
    mode: 'auto', // 'auto', 'off'
    videoEl: null,
    canvas: null,
    ctx: null,
    isTracking: false,
    animId: null,
    lastFrameTime: 0,
    prevLuma: null,
    isDragging: false,
    dragStartTimestamp: 0,
    lastDropTimestamp: 0,
    detectedSize: 'all',
    pipWindow: null
  }
};

/**
 * Carga las estadísticas guardadas desde LocalStorage
 */
export function loadSavedStats() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state.trainer.streak = Number(parsed.streak) || 0;
      state.trainer.bestStreak = Number(parsed.bestStreak) || 0;
      state.trainer.correctCount = Number(parsed.correctCount) || 0;
      state.trainer.totalCount = Number(parsed.totalCount) || 0;
      state.trainer.virtualKoens = Number(parsed.virtualKoens) || 0;
    }
  } catch (e) {
    console.warn('[State] Error al leer LocalStorage:', e);
  }
}

/**
 * Persiste las estadísticas del jugador de forma segura
 */
export function saveStats() {
  try {
    const payload = JSON.stringify({
      streak: state.trainer.streak,
      bestStreak: state.trainer.bestStreak,
      correctCount: state.trainer.correctCount,
      totalCount: state.trainer.totalCount,
      virtualKoens: state.trainer.virtualKoens
    });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (e) {
    console.warn('[State] Error al escribir en LocalStorage:', e);
  }
}

