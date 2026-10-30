/**
 * ABI SOUND MASTER - ENTRADA PRINCIPAL DE LA APLICACIÓN (ES MODULES)
 * Punto de arranque modular, reactivo y desacoplado.
 */

import { state, loadSavedStats } from './core/state.js';
import { generateNewMysteryRound, updateStatsDisplay } from './trainer/trainerEngine.js';
import { initDOMController, switchTab } from './ui/domController.js';
import { renderAssistantCards } from './assistant/assistantView.js';
import { renderEncyclopedia } from './encyclopedia/encyclopediaView.js';
import { updateComparePreset } from './compare/compareView.js';
import { renderCheatSheet } from './cheatsheet/cheatsheetView.js';
import { preloadRadarTemplates } from './radar/radarEngine.js';
import { startRadarScope } from './radar/scopeRenderer.js';

function bootstrap() {
  console.log('[ABI Sound Master] Iniciando módulos de la aplicación v2.0 (ESM)...');

  // 1. Cargar persistencia y actualizar estadísticas
  loadSavedStats();
  updateStatsDisplay();

  // 2. Inicializar controladores de interfaz y escuchadores de eventos
  initDOMController();

  // 3. Renderizar vistas secundarias para navegación instantánea
  renderAssistantCards();
  renderEncyclopedia();
  updateComparePreset('lion_vs_cheetah');
  renderCheatSheet();

  // 4. Generar primera ronda del entrenador
  generateNewMysteryRound();

  // 5. Iniciar osciloscopio del radar a 60 FPS
  startRadarScope();

  // 6. Precargar firmas acústicas precalculadas en segundo plano
  preloadRadarTemplates().catch(err => {
    console.warn('[ABI Sound Master] Error en precarga de firmas:', err);
  });

  // 7. Exponer objeto de diagnóstico para consola del navegador
  window.ABI_APP = {
    state,
    version: '2.0.1',
    switchTab,
    renderEncyclopedia,
    renderAssistantCards,
    renderCheatSheet
  };

  console.log('[ABI Sound Master] Sistema táctico operativo al 100%.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

