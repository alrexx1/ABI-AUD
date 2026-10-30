/**
 * ABI SOUND MASTER - CONTROLADOR DE INTERFAZ Y EVENTOS DOM
 * Enlace desacoplado de botones, selectores, controles de radar y atajos tácticos de teclado.
 */

import { state, saveStats } from '../core/state.js';
import { playSoundFile, playAudioCycle, playSynthSFX } from '../audio/audioEngine.js';
import { generateNewMysteryRound, handleTrainerDecision, updateStatsDisplay } from '../trainer/trainerEngine.js';
import { renderAssistantCards } from '../assistant/assistantView.js';
import { renderEncyclopedia } from '../encyclopedia/encyclopediaView.js';
import { updateComparePreset } from '../compare/compareView.js';
import { renderCheatSheet } from '../cheatsheet/cheatsheetView.js';
import { 
  toggleRadarCapture, 
  autoCalibrateRadarNoise, 
  simulateRadarDrop, 
  clearRadarHistory 
} from '../radar/radarEngine.js';
import { toggleRadarPiP } from './pipOverlay.js';
import { startVisionTracking, stopVisionTracking } from '../vision/visionEngine.js';

export function switchTab(tabId) {
  state.currentTab = tabId;

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `view-${tabId}`);
  });

  if (tabId === 'assistant') renderAssistantCards();
  else if (tabId === 'encyclopedia') renderEncyclopedia();
  else if (tabId === 'compare') updateComparePreset(state.compare.currentPreset);
  else if (tabId === 'cheatsheet') renderCheatSheet();
}

export function initDOMController() {
  // 1. Navegación por pestañas
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      playSynthSFX('click');
      const tabId = tab.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  const brandHome = document.getElementById('brand-home-btn');
  if (brandHome) {
    brandHome.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('trainer');
    });
  }

  // 2. Entrenador: Botones de Audio
  const btnDrop = document.getElementById('btn-play-drop');
  if (btnDrop) {
    btnDrop.addEventListener('click', () => {
      playSynthSFX('click');
      if (state.trainer.currentMystery) {
        playSoundFile(state.trainer.currentMystery.dropSound, 'Caja Misteriosa', 'Sonido DROP (Soltar)');
      }
    });
  }

  const btnPickup = document.getElementById('btn-play-pickup');
  if (btnPickup) {
    btnPickup.addEventListener('click', () => {
      playSynthSFX('click');
      if (state.trainer.currentMystery) {
        playSoundFile(state.trainer.currentMystery.pickupSound, 'Caja Misteriosa', 'Sonido PICKUP (Arrastrar)');
      }
    });
  }

  const btnCycle = document.getElementById('btn-play-cycle');
  if (btnCycle) {
    btnCycle.addEventListener('click', () => {
      playSynthSFX('click');
      if (state.trainer.currentMystery) {
        playAudioCycle(state.trainer.currentMystery.pickupSound, state.trainer.currentMystery.dropSound, 'Caja Misteriosa');
      }
    });
  }

  // 3. Entrenador: Decisiones
  const btnChooseRed = document.getElementById('btn-choose-red');
  if (btnChooseRed) {
    btnChooseRed.addEventListener('click', () => handleTrainerDecision(true));
  }

  const btnChoosePass = document.getElementById('btn-choose-pass');
  if (btnChoosePass) {
    btnChoosePass.addEventListener('click', () => handleTrainerDecision(false));
  }

  const btnNextRound = document.getElementById('btn-next-round');
  if (btnNextRound) {
    btnNextRound.addEventListener('click', () => {
      playSynthSFX('click');
      state.trainer.round++;
      generateNewMysteryRound();
    });
  }

  const btnResetStats = document.getElementById('btn-reset-stats');
  if (btnResetStats) {
    btnResetStats.addEventListener('click', () => {
      if (confirm('¿Deseas reiniciar tus estadísticas y rango de entrenamiento?')) {
        state.trainer.streak = 0;
        state.trainer.bestStreak = 0;
        state.trainer.correctCount = 0;
        state.trainer.totalCount = 0;
        state.trainer.virtualKoens = 0;
        state.trainer.round = 1;
        saveStats();
        updateStatsDisplay();
        generateNewMysteryRound();
      }
    });
  }

  // 4. Entrenador: Filtros
  const selectTier = document.getElementById('trainer-tier-filter');
  if (selectTier) {
    selectTier.addEventListener('change', (e) => {
      state.trainer.tierFilter = e.target.value;
      generateNewMysteryRound();
    });
  }

  const selectSize = document.getElementById('trainer-size-filter');
  if (selectSize) {
    selectSize.addEventListener('change', (e) => {
      state.trainer.sizeFilter = e.target.value;
      generateNewMysteryRound();
    });
  }

  // 5. Asistente de Raid: Filtros
  const selectAssSize = document.getElementById('assistant-size-filter');
  if (selectAssSize) {
    selectAssSize.addEventListener('change', (e) => {
      state.assistant.selectedSize = e.target.value;
      renderAssistantCards();
    });
  }

  const selectAssCat = document.getElementById('assistant-cat-filter');
  if (selectAssCat) {
    selectAssCat.addEventListener('change', (e) => {
      state.assistant.selectedCategory = e.target.value;
      renderAssistantCards();
    });
  }

  const checkAssOnlyReds = document.getElementById('assistant-only-reds');
  if (checkAssOnlyReds) {
    checkAssOnlyReds.addEventListener('change', (e) => {
      state.assistant.onlyReds = e.target.checked;
      renderAssistantCards();
    });
  }

  // 6. Enciclopedia: Búsqueda y Tags
  const searchInput = document.getElementById('encyclopedia-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.encyclopedia.searchQuery = e.target.value;
      renderEncyclopedia();
    });
  }

  const catTagsRow = document.getElementById('encyclopedia-cat-tags');
  if (catTagsRow) {
    catTagsRow.querySelectorAll('.cat-tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playSynthSFX('click');
        catTagsRow.querySelectorAll('.cat-tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.encyclopedia.activeCategory = btn.getAttribute('data-cat');
        renderEncyclopedia();
      });
    });
  }

  // 7. Comparador A/B: Presets
  const presetSelect = document.getElementById('compare-preset-select');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      state.compare.currentPreset = e.target.value;
      updateComparePreset(e.target.value);
    });
  }

  // 8. Controles del Radar Acústico en Vivo
  const btnToggleRadar = document.getElementById('btn-toggle-radar');
  if (btnToggleRadar) {
    btnToggleRadar.addEventListener('click', toggleRadarCapture);
  }

  const selectRadarSource = document.getElementById('radar-source-mode');
  if (selectRadarSource) {
    selectRadarSource.addEventListener('change', (e) => {
      state.radar.sourceMode = e.target.value;
      if (state.radar.active) {
        toggleRadarCapture();
      }
    });
  }

  const selectGainBoost = document.getElementById('radar-gain-boost');
  if (selectGainBoost) {
    selectGainBoost.addEventListener('change', (e) => {
      state.radar.gainBoost = parseFloat(e.target.value);
      if (state.radar.gainNode) {
        state.radar.gainNode.gain.value = state.radar.gainBoost;
      }
      const rateInfo = document.getElementById('radar-rate-info');
      if (rateInfo && state.radar.audioContext) {
        rateInfo.textContent = `${(state.radar.audioContext.sampleRate / 1000).toFixed(1)} kHz • DSP x${state.radar.gainBoost}`;
      }
    });
  }

  const selectDetectMode = document.getElementById('radar-detect-mode');
  if (selectDetectMode) {
    selectDetectMode.addEventListener('change', (e) => {
      state.radar.detectMode = e.target.value;
    });
  }

  const selectSizeFilter = document.getElementById('radar-size-filter');
  if (selectSizeFilter) {
    selectSizeFilter.addEventListener('change', (e) => {
      state.radar.selectedSize = e.target.value;
    });
  }

  const selectSensitivityPreset = document.getElementById('radar-sensitivity-preset');
  const sliderThreshold = document.getElementById('radar-threshold-slider');
  const valThreshold = document.getElementById('radar-threshold-val');
  const markerThreshold = document.getElementById('radar-threshold-marker');

  function applyRadarThreshold(val, presetName = null) {
    state.radar.threshold = val;
    if (sliderThreshold) sliderThreshold.value = val;

    const pct = Math.max(0, Math.min(100, ((val - 0.003) / (0.060 - 0.003)) * 100));
    if (markerThreshold) markerThreshold.style.left = `${pct}%`;

    let label = 'Sensibilidad Equilibrada';
    if (val <= 0.010) label = 'Ultra-Sensible (Capta arrastres suaves)';
    else if (val <= 0.020) label = 'Equilibrada (Recomendada)';
    else if (val >= 0.035) label = 'Filtro Fuerte (Solo impactos altos)';

    if (valThreshold) valThreshold.textContent = `${val.toFixed(3)} (${label})`;
    if (presetName && selectSensitivityPreset) {
      selectSensitivityPreset.value = presetName;
    }
  }

  if (selectSensitivityPreset) {
    selectSensitivityPreset.addEventListener('change', (e) => {
      const p = e.target.value;
      if (p === 'ultra') applyRadarThreshold(0.008, 'ultra');
      else if (p === 'balanced') applyRadarThreshold(0.015, 'balanced');
      else if (p === 'noisy') applyRadarThreshold(0.026, 'noisy');
    });
  }

  if (sliderThreshold) {
    sliderThreshold.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      applyRadarThreshold(val, 'custom');
    });
  }

  const btnAutoCalibrate = document.getElementById('btn-radar-autocalibrate');
  if (btnAutoCalibrate) {
    btnAutoCalibrate.addEventListener('click', autoCalibrateRadarNoise);
  }

  const btnTestSample = document.getElementById('btn-test-radar-sample');
  if (btnTestSample) {
    btnTestSample.addEventListener('click', simulateRadarDrop);
  }

  const btnClearHistory = document.getElementById('btn-clear-radar-history');
  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', clearRadarHistory);
  }

  const selectVisionMode = document.getElementById('radar-vision-mode');
  if (selectVisionMode) {
    selectVisionMode.addEventListener('change', (e) => {
      state.vision.mode = e.target.value;
      if (state.radar.active && state.radar.stream) {
        if (state.vision.mode === 'auto') {
          startVisionTracking(state.radar.stream);
        } else {
          stopVisionTracking();
          state.radar.stream.getVideoTracks().forEach(t => t.stop());
        }
      }
    });
  }

  const btnTogglePiP = document.getElementById('btn-toggle-pip');
  if (btnTogglePiP) {
    btnTogglePiP.addEventListener('click', toggleRadarPiP);
  }

  // 9. Atajos de Teclado Tácticos
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && state.currentTab === 'trainer' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      if (state.trainer.currentMystery) {
        playSoundFile(state.trainer.currentMystery.dropSound, 'Caja Misteriosa', 'Sonido DROP');
      }
    }
    if (state.currentTab === 'trainer' && !state.trainer.isRevealed) {
      if (e.key === 'ArrowRight' || e.key === '1') {
        handleTrainerDecision(true);
      } else if (e.key === 'ArrowLeft' || e.key === '2') {
        handleTrainerDecision(false);
      }
    } else if (state.currentTab === 'trainer' && state.trainer.isRevealed && (e.key === 'Enter' || e.key === 'Space')) {
      state.trainer.round++;
      generateNewMysteryRound();
    }
  });
}

