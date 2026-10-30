/**
 * ABI SOUND MASTER - ENTRADA PRINCIPAL DE LA APLICACIÓN (ES MODULES)
 * Punto de arranque modular, reactivo y desacoplado.
 */

import { state, loadSavedStats } from './core/state.js';
import { generateNewMysteryRound, updateStatsDisplay } from './trainer/trainerEngine.js';
import { initDOMController, switchTab } from './ui/domController.js';
import { preloadRadarTemplates } from './radar/radarEngine.js';

function bootstrap() {
  console.log('[ABI Sound Master] Iniciando módulos de la aplicación v2.0 (ESM)...');

  // 1. Cargar persistencia
  loadSavedStats();
  updateStatsDisplay();

  // 2. Inicializar controladores de UI
  initDOMController();

  // 3. Generar primera ronda del entrenador
  generateNewMysteryRound();

  // 4. Precargar firmas acústicas en segundo plano
  preloadRadarTemplates().catch(err => {
    console.warn('[ABI Sound Master] Error en precarga de firmas:', err);
  });

  // 5. Exponer objeto de diagnóstico para consola de desarrollador
  window.ABI_APP = {
    state,
    version: '2.0.0',
    switchTab
  };

  console.log('[ABI Sound Master] Sistema táctico operativo.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

