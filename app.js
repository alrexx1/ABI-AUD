/**
 * ABI SOUND MASTER - LÓGICA PRINCIPAL DEL APLICATIVO
 * Arena Breakout: Infinite - Field Merchant Sound Engine
 * Desarrollado en JavaScript Vanilla puro con Web Audio API
 */

(function () {
  'use strict';

  // ==========================================================================
  // ESTADO GLOBAL DE LA APLICACIÓN
  // ==========================================================================
  const state = {
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

    // Estado del Radar Acústico en Vivo (Detector Automático)
    radar: {
      active: false,
      sourceMode: 'system',
      gainBoost: 4.0,
      detectMode: 'both', // 'both', 'chain', 'drop', 'pickup'
      selectedSize: 'all', // 'all', '1x2', '2x2', '2x3', '1x3', '2x1'
      sensitivityPreset: 'ultra',
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
      // Continuous circular ring buffer for audio capture (16384 samples ~340ms)
      ringBuffer: new Float32Array(16384),
      ringWriteIdx: 0,
      isCalibrating: false,
      lastEvent: null,
      noiseSpectrum: new Float32Array(24),
      liveBandEnergies: new Float32Array(24),
      liveBandPeaks: new Float32Array(24)
    },

    // Estado del Motor de Visión Multimodal (Detección de Pantalla y Overlay HUD)
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

  // Cargar estadísticas guardadas en LocalStorage
  function loadSavedStats() {
    try {
      const saved = localStorage.getItem('abi_sound_master_stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        state.trainer.streak = parsed.streak || 0;
        state.trainer.bestStreak = parsed.bestStreak || 0;
        state.trainer.correctCount = parsed.correctCount || 0;
        state.trainer.totalCount = parsed.totalCount || 0;
        state.trainer.virtualKoens = parsed.virtualKoens || 0;
      }
    } catch (e) {
      console.warn('No se pudo acceder a LocalStorage:', e);
    }
  }

  function saveStats() {
    try {
      localStorage.setItem('abi_sound_master_stats', JSON.stringify({
        streak: state.trainer.streak,
        bestStreak: state.trainer.bestStreak,
        correctCount: state.trainer.correctCount,
        totalCount: state.trainer.totalCount,
        virtualKoens: state.trainer.virtualKoens
      }));
    } catch (e) {
      console.warn('Error guardando en LocalStorage:', e);
    }
  }

  // ==========================================================================
  // MOTOR DE AUDIO (HTML5 AUDIO + WEB AUDIO API ANALYZER & SFX SYNTH)
  // ==========================================================================
  function initAudioContext() {
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
  }

  // Reproducir archivo de audio oficial (.ogg)
  function playSoundFile(filename, title = '', subtitle = '') {
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
      // Si el elemento ya estaba conectado o hay restricción de CORS
    }

    audio.play().catch(err => {
      console.error('Error reproduciendo audio:', err);
    });

    audio.onended = () => {
      if (hudDot) hudDot.classList.remove('playing');
    };
  }

  // Reproducir secuencia: Pickup (Arrastrar) y luego Drop (Soltar)
  function playAudioCycle(pickupFile, dropFile, title = '') {
    if (!pickupFile && !dropFile) return;
    playSoundFile(pickupFile, title, 'Arrastrando ítem (Pickup)...');
    
    if (dropFile) {
      setTimeout(() => {
        playSoundFile(dropFile, title, 'Soltando en inventario (Drop)...');
      }, 500);
    }
  }

  // Sintetizador Web Audio para SFX de interfaz (clics tácticos, aciertos, fallos)
  function playSynthSFX(type) {
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

  // Visualizador Canvas en tiempo real
  function startVisualizerLoop() {
    const canvas = document.getElementById('visualizer-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = state.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      requestAnimationFrame(draw);
      state.analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        // Color degradado táctico: Ámbar a Rojo
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

  // ==========================================================================
  // VISTA 1: ENTRENADOR DE OÍDO (TRAINER / QUIZ ENGINE)
  // ==========================================================================
  
  // Generar nueva ronda con un ítem misterioso
  function generateNewMysteryRound() {
    const items = ABI_DATA.items;
    const sounds = ABI_DATA.sounds;

    // Filtrar candidatos según configuración
    let candidateItems = [];

    if (state.trainer.tierFilter === 'red_only_pool') {
      // Ítems pertenecientes a sonidos que tienen rojo
      const redSoundIds = new Set(sounds.filter(s => s.hasRed).map(s => s.id));
      candidateItems = items.filter(it => redSoundIds.has(it.soundId));
    } else if (state.trainer.tierFilter === 'traps') {
      // Sonidos compartidos peligrosos (sonidos que tienen rojos Y también no-rojos)
      const trapSoundIds = new Set(sounds.filter(s => s.hasRed && !s.isGuaranteedRed).map(s => s.id));
      candidateItems = items.filter(it => trapSoundIds.has(it.soundId));
    } else if (state.trainer.tierFilter === 'high') {
      // Ítems de alto valor (precio referencia > 100,000)
      candidateItems = items.filter(it => it.referencePrice >= 100000 || it.rarity >= 5);
    } else {
      candidateItems = items;
    }

    // Filtro por tamaño
    if (state.trainer.sizeFilter !== 'all') {
      candidateItems = candidateItems.filter(it => it.sizeLabel === state.trainer.sizeFilter);
    }

    if (candidateItems.length === 0) {
      candidateItems = items; // Fallback
    }

    // Elegir aleatoriamente, balanceando ~40% probabilidad de rojo para que sea emocionante
    const redCandidates = candidateItems.filter(it => it.isRed);
    const nonRedCandidates = candidateItems.filter(it => !it.isRed);

    let chosenItem;
    if (redCandidates.length > 0 && Math.random() < 0.4) {
      chosenItem = redCandidates[Math.floor(Math.random() * redCandidates.length)];
    } else if (nonRedCandidates.length > 0) {
      chosenItem = nonRedCandidates[Math.floor(Math.random() * nonRedCandidates.length)];
    } else {
      chosenItem = candidateItems[Math.floor(Math.random() * candidateItems.length)];
    }

    // Obtener sonido correspondiente
    const soundData = sounds.find(s => s.id === chosenItem.soundId) || sounds[0];

    // Simular precio de caja misteriosa de acuerdo al tamaño y rareza
    let simulatedBoxPrice = 470000;
    if (chosenItem.sizeLabel === '1x2' || chosenItem.sizeLabel === '2x1') {
      simulatedBoxPrice = 250000;
    } else if (chosenItem.sizeLabel === '2x3' || chosenItem.sizeLabel === '3x2') {
      simulatedBoxPrice = 550000;
    } else if (chosenItem.sizeLabel === '2x2') {
      simulatedBoxPrice = Math.random() > 0.5 ? 470000 : 350000;
    }

    state.trainer.currentMystery = {
      item: chosenItem,
      sound: soundData,
      boxPrice: simulatedBoxPrice,
      dropSound: chosenItem.dropSound || soundData.drop,
      pickupSound: chosenItem.pickupSound || soundData.pickup
    };
    state.trainer.isRevealed = false;

    renderTrainerStage();
  }

  function renderTrainerStage() {
    const mystery = state.trainer.currentMystery;
    if (!mystery) return;

    // Resetear UI
    const mysteryBox = document.getElementById('mystery-box');
    const revealedImg = document.getElementById('revealed-img');
    const boxSizeTag = document.getElementById('box-size-display');
    const boxPriceTag = document.getElementById('box-price-display');
    const boxHalo = document.getElementById('box-halo');
    const decisionPanel = document.getElementById('decision-panel');
    const feedbackBox = document.getElementById('feedback-box');
    const roundTag = document.getElementById('trainer-round-tag');

    if (roundTag) roundTag.textContent = `Ronda #${state.trainer.round}`;
    if (boxSizeTag) boxSizeTag.textContent = mystery.item.sizeLabel;
    if (boxPriceTag) boxPriceTag.innerHTML = `<span>💰</span> ${mystery.boxPrice.toLocaleString()} K`;

    if (mysteryBox) {
      mysteryBox.className = 'mystery-box-container';
    }
    if (boxHalo) {
      boxHalo.className = 'mystery-box-halo';
    }
    if (revealedImg) {
      revealedImg.src = '';
    }

    if (decisionPanel) decisionPanel.style.display = 'grid';
    if (feedbackBox) {
      feedbackBox.style.display = 'none';
      feedbackBox.className = 'feedback-box';
    }

    // Reproducir automáticamente el drop al inicio de la ronda para que el usuario escuche
    playSoundFile(mystery.dropSound, `Caja Misteriosa (${mystery.item.sizeLabel})`, 'Escuchando sonido de Drop...');
  }

  // Evaluar decisión del usuario
  function handleTrainerDecision(userChoseRed) {
    if (state.trainer.isRevealed) return;
    state.trainer.isRevealed = true;

    const mystery = state.trainer.currentMystery;
    const isActualRed = mystery.item.isRed;
    const isCorrect = (userChoseRed === isActualRed);

    state.trainer.totalCount++;

    // Actualizar Koens y Racha
    let profitDelta = 0;
    if (userChoseRed) {
      if (isActualRed) {
        // Compró y era rojo -> Gana la diferencia entre el valor de mercado y el costo de la caja
        profitDelta = mystery.item.referencePrice - mystery.boxPrice;
        state.trainer.virtualKoens += profitDelta;
        state.trainer.streak++;
        state.trainer.correctCount++;
        playSynthSFX('success');
      } else {
        // Compró y era chatarra/dorado barato -> Pérdida
        profitDelta = mystery.item.referencePrice - mystery.boxPrice;
        state.trainer.virtualKoens += profitDelta;
        state.trainer.streak = 0;
        playSynthSFX('fail');
      }
    } else {
      // Pasó
      if (!isActualRed) {
        // Correcto en pasar (ahorró dinero)
        profitDelta = 0;
        state.trainer.streak++;
        state.trainer.correctCount++;
        playSynthSFX('success');
      } else {
        // Dejó pasar un rojo valioso
        profitDelta = -(mystery.item.referencePrice - mystery.boxPrice);
        state.trainer.streak = 0;
        playSynthSFX('fail');
      }
    }

    if (state.trainer.streak > state.trainer.bestStreak) {
      state.trainer.bestStreak = state.trainer.streak;
    }

    saveStats();
    updateStatsDisplay();

    // Revelar animación en la caja
    const mysteryBox = document.getElementById('mystery-box');
    const revealedImg = document.getElementById('revealed-img');
    const boxHalo = document.getElementById('box-halo');

    if (mysteryBox) {
      mysteryBox.classList.add('revealed');
      mysteryBox.classList.add(isActualRed ? 'red' : 'non-red');
    }
    if (boxHalo) {
      boxHalo.classList.add(isActualRed ? 'red-glow' : '');
    }
    if (revealedImg) {
      revealedImg.src = mystery.item.iconUrl;
    }

    // Mostrar panel de Feedback
    const decisionPanel = document.getElementById('decision-panel');
    const feedbackBox = document.getElementById('feedback-box');
    const verdictEl = document.getElementById('feedback-verdict');
    const profitEl = document.getElementById('feedback-profit');
    const itemImgEl = document.getElementById('feedback-item-img');
    const itemNameEl = document.getElementById('feedback-item-name');
    const itemMetaEl = document.getElementById('feedback-item-meta');
    const tipEl = document.getElementById('feedback-acoustic-tip');

    if (decisionPanel) decisionPanel.style.display = 'none';
    if (feedbackBox) {
      feedbackBox.style.display = 'block';
      feedbackBox.className = `feedback-box active ${isCorrect ? 'correct' : 'wrong'}`;
    }

    if (verdictEl) {
      if (isCorrect) {
        verdictEl.innerHTML = `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          ${userChoseRed ? '¡ACIERTO! ¡DETECTASTE UN ÍTEM ROJO!' : '¡ACERTADO! NO VALÍA LA PENA (CHATARRA)'}
        `;
        verdictEl.className = 'feedback-verdict correct';
      } else {
        verdictEl.innerHTML = `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          ${userChoseRed ? '¡ERROR! COMPRASTE CHATARRA' : '¡DEJASTE ESCAPAR UN ÍTEM ROJO!'}
        `;
        verdictEl.className = 'feedback-verdict wrong';
      }
    }

    if (profitEl) {
      const sign = profitDelta >= 0 ? '+' : '';
      profitEl.textContent = `${sign}${profitDelta.toLocaleString()} Koens`;
      profitEl.className = `feedback-profit ${profitDelta >= 0 ? 'positive' : 'negative'}`;
    }

    if (itemImgEl) itemImgEl.src = mystery.item.iconUrl;
    if (itemNameEl) itemNameEl.textContent = `${mystery.item.nameEs} (${mystery.item.name})`;
    if (itemMetaEl) {
      const rarityLabel = isActualRed ? '🔴 ROJO (Tier 6)' : mystery.item.isGold ? '🟡 DORADO (Tier 5)' : '🟣 MORADO / COMÚN';
      itemMetaEl.textContent = `${rarityLabel} | Valor de Mercado: ${mystery.item.referencePrice.toLocaleString()} K | Tamaño: ${mystery.item.sizeLabel}`;
    }

    if (tipEl) {
      tipEl.innerHTML = `
        <strong>Perfil Acústico #${mystery.sound.id}:</strong> ${mystery.sound.name}.<br>
        <em>${mystery.sound.description}</em><br>
        ${mystery.sound.isGuaranteedRed ? '🔥 <strong>¡Sonido 100% Rojo garantizado en el juego!</strong>' : ''}
      `;
    }
  }

  // Actualizar Sidebar de Estadísticas y Rango
  function updateStatsDisplay() {
    const t = state.trainer;
    const streakEl = document.getElementById('stat-current-streak');
    const bestStreakEl = document.getElementById('stat-best-streak');
    const accuracyEl = document.getElementById('stat-accuracy');
    const totalEl = document.getElementById('stat-total-games');
    const profitEl = document.getElementById('stat-koen-profit');
    const rankTitleEl = document.getElementById('rank-title');
    const rankSubEl = document.getElementById('rank-sub');

    if (streakEl) streakEl.textContent = `${t.streak} 🔥`;
    if (bestStreakEl) bestStreakEl.textContent = `${t.bestStreak}`;
    if (totalEl) totalEl.textContent = `${t.totalCount}`;

    const acc = t.totalCount > 0 ? Math.round((t.correctCount / t.totalCount) * 100) : 0;
    if (accuracyEl) accuracyEl.textContent = `${acc}%`;

    if (profitEl) {
      const sign = t.virtualKoens >= 0 ? '+' : '';
      profitEl.textContent = `${sign}${t.virtualKoens.toLocaleString()} K`;
      profitEl.className = `mini-stat-val ${t.virtualKoens >= 0 ? 'gold' : 'red'}`;
    }

    // Calcular Rango Táctico
    let rank = 'Recluta de Campo';
    if (t.correctCount >= 25) rank = 'Maestro de la Zona Oscura 🏆';
    else if (t.correctCount >= 15) rank = 'Comerciante Veterano 💎';
    else if (t.correctCount >= 8) rank = 'Cazador de Rojos 🎯';
    else if (t.correctCount >= 3) rank = 'Oído Táctico 🎧';

    if (rankTitleEl) rankTitleEl.textContent = rank;
    if (rankSubEl) rankSubEl.textContent = `${t.correctCount} aciertos de ${t.totalCount} rondas`;
  }

  // ==========================================================================
  // VISTA 2: ASISTENTE DE RAID EN VIVO (FIELD MERCHANT CALCULATOR)
  // ==========================================================================
  function renderAssistantCards() {
    const grid = document.getElementById('assistant-cards-grid');
    const countEl = document.getElementById('assistant-results-count');
    if (!grid) return;

    const sounds = ABI_DATA.sounds;
    const items = ABI_DATA.items;

    // Filtrar sonidos que tengan algún ítem compatible con los filtros
    const filteredSounds = sounds.filter(sound => {
      // Si se pide solo con rojo
      if (state.assistant.onlyReds && !sound.hasRed) {
        return false;
      }

      // Filtrar ítems de este sonido según tamaño
      let matchingItems = sound.items.map(sIt => items.find(it => it.id === sIt.id)).filter(Boolean);

      if (state.assistant.selectedSize !== 'all') {
        matchingItems = matchingItems.filter(it => it.sizeLabel === state.assistant.selectedSize);
        if (matchingItems.length === 0) return false;
      }

      if (state.assistant.selectedCategory !== 'all') {
        matchingItems = matchingItems.filter(it => it.categoryName === state.assistant.selectedCategory);
        if (matchingItems.length === 0) return false;
      }

      return true;
    });

    if (countEl) countEl.textContent = `${filteredSounds.length}`;

    if (filteredSounds.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem;">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div style="font-family: var(--font-hud); font-size: 1.2rem; color: #fff;">No se encontraron sonidos con estos filtros</div>
          <div style="font-size: 0.85rem; margin-top: 0.25rem;">Intenta desactivar el filtro de tamaño o desmarcar "Solo Rojos".</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = filteredSounds.map(sound => {
      // Determinar clase de estado
      let statusClass = 'no-red';
      let badgeHtml = '<span class="red-probability-badge badge-safe-skip">⚪ 0% Rojo</span>';

      if (sound.isGuaranteedRed) {
        statusClass = 'guaranteed-red';
        badgeHtml = '<span class="red-probability-badge badge-100-red">🔥 100% GARANTÍA ROJO</span>';
      } else if (sound.hasRed) {
        statusClass = 'has-red';
        badgeHtml = `<span class="red-probability-badge badge-mixed-red">🟡 ${sound.redCount} Rojo(s) (${sound.redRatio}%)</span>`;
      }

      // Obtener ítems filtrados de este sonido
      let displayItems = sound.items.map(sIt => items.find(it => it.id === sIt.id)).filter(Boolean);
      if (state.assistant.selectedSize !== 'all') {
        displayItems = displayItems.filter(it => it.sizeLabel === state.assistant.selectedSize);
      }

      const itemsHtml = displayItems.slice(0, 5).map(it => `
        <div class="item-chip-row ${it.isRed ? 'is-red' : ''}">
          <span class="chip-name">
            ${it.isRed ? '🔴' : it.isGold ? '🟡' : '⚪'} 
            <strong>${it.nameEs}</strong> <small style="color: var(--text-dim);">(${it.sizeLabel})</small>
          </span>
          <span class="chip-price">${it.referencePrice.toLocaleString()} K</span>
        </div>
      `).join('');

      const moreItemsText = displayItems.length > 5 ? `<div style="font-size: 0.7rem; color: var(--text-dim); text-align: center;">+ ${displayItems.length - 5} ítems más...</div>` : '';

      return `
        <div class="sound-match-card ${statusClass}">
          <div class="card-top-bar">
            <div class="sound-identity">
              <span class="sound-id-pill">ID #${sound.id}</span>
              <span class="sound-name-title">${sound.name}</span>
            </div>
            ${badgeHtml}
          </div>

          <p class="sound-desc-text">${sound.description}</p>

          <div class="sound-audio-buttons">
            <button class="btn-mini-audio" data-sound-action="drop" data-file="${sound.drop}" data-name="ID #${sound.id} - ${sound.name}">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Escuchar DROP
            </button>
            <button class="btn-mini-audio" data-sound-action="pickup" data-file="${sound.pickup}" data-name="ID #${sound.id} - ${sound.name}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
              Pickup
            </button>
          </div>

          <div class="potential-items-drawer">
            <div class="drawer-header">Ítems Posibles en este Sonido (${displayItems.length}):</div>
            ${itemsHtml}
            ${moreItemsText}
          </div>
        </div>
      `;
    }).join('');

    // Asignar eventos de click para audio en las tarjetas
    grid.querySelectorAll('.btn-mini-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        playSynthSFX('click');
        const file = btn.getAttribute('data-file');
        const name = btn.getAttribute('data-name');
        const action = btn.getAttribute('data-sound-action');
        playSoundFile(file, name, action === 'drop' ? 'Sonido Drop (Soltar)' : 'Sonido Pickup (Arrastrar)');
      });
    });
  }

  // ==========================================================================
  // VISTA 3: ENCICLOPEDIA DE LOS 32 ÍTEMS ROJOS
  // ==========================================================================
  function renderEncyclopedia() {
    const grid = document.getElementById('encyclopedia-items-grid');
    if (!grid) return;

    const items = ABI_DATA.items.filter(it => it.isRed);
    const sounds = ABI_DATA.sounds;

    const query = state.encyclopedia.searchQuery.toLowerCase().trim();
    const cat = state.encyclopedia.activeCategory;

    const filtered = items.filter(it => {
      // Filtro de búsqueda de texto
      if (query) {
        const matchesName = it.name.toLowerCase().includes(query) || it.nameEs.toLowerCase().includes(query);
        if (!matchesName) return false;
      }

      // Filtro por categoría acústica
      if (cat === 'world') {
        return it.isWorldRed;
      }
      if (cat === 'merchant') {
        return !it.isWorldRed;
      }
      if (cat === 'guaranteed') {
        const sound = sounds.find(s => s.id === it.soundId);
        return (sound && sound.isGuaranteedRed) || it.id === 408080027; // Tetera / Documento
      }
      if (cat === 'ceramic') {
        return it.soundId === 30 || it.soundId === 32 || it.soundId === 24; // Porcelana / Vidrio / Tetera / Elysium
      }
      if (cat === 'sculpture') {
        return it.soundId === 28 || it.soundId === 36 || it.soundId === 6; // Esculturas / León / Serpiente / Tablilla
      }
      if (cat === 'tech') {
        return it.soundId === 10 || it.soundId === 18; // Módulo TI / Módulos técnicos / Brazo T-008
      }
      if (cat === 'jewelry') {
        return it.soundId === 33; // Cadena de Oro / Joyería
      }
      if (cat === 'paper') {
        return it.soundId === 35 || it.soundId === 34 || it.soundId === 37; // Documento Secreto / Álbum / Mapa
      }

      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg);">
          No se encontraron ítems rojos con ese criterio.
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(item => {
      const sound = sounds.find(s => s.id === item.soundId);
      const isPure = sound ? sound.isGuaranteedRed : false;
      const isWorld = item.isWorldRed;
      const sourceBadge = isWorld ? 
        '<span style="background: rgba(245, 158, 11, 0.2); color: var(--accent-gold); border: 1px solid var(--accent-gold); padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700;">💎 RAID / CAJA FUERTE</span>' : 
        '<span style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); border: 1px solid rgba(6, 182, 212, 0.4); padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700;">🏪 VENDEDOR CAMPO</span>';

      const isSecretDoc = item.id === 408080027;
      const cardBorder = isSecretDoc ? 'border: 2px solid var(--accent-gold); box-shadow: 0 0 20px rgba(245, 158, 11, 0.35);' : '';

      return `
        <div class="red-item-card" style="${cardBorder}">
          <div class="red-card-header">
            <div class="red-item-icon-box" style="${isSecretDoc ? 'border-color: var(--accent-gold); background: rgba(245, 158, 11, 0.15);' : ''}">
              <img src="${item.iconUrl}" alt="${item.nameEs}" loading="lazy" onerror="if(!this.dataset.cdn){this.dataset.cdn='1';this.src='https://hexaov91.github.io/abi-assets/image/Normal/${item.id}.png';}else{this.onerror=null;this.style.opacity='0.5';}">
            </div>
            <div class="red-item-main-info">
              <div style="margin-bottom: 0.25rem;">${sourceBadge}</div>
              <h3 class="red-item-title" style="${isSecretDoc ? 'color: var(--accent-gold);' : ''}">${item.nameEs}</h3>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${item.name}</div>
              <div class="red-item-price" style="${isSecretDoc ? 'font-size: 1.15rem; color: #fbbf24;' : ''}">
                ${item.referencePrice.toLocaleString()} Koens
              </div>
              <div class="red-item-size">Tamaño: <strong>${item.sizeLabel}</strong> &bull; ${item.categoryNameEs}</div>
            </div>
          </div>

          <div class="red-acoustic-tag">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <span><strong>Sonido #${item.soundId}:</strong> ${sound ? sound.name : 'Perfil Acústico Específico'}</span>
          </div>

          <div style="font-size: 0.75rem; color: var(--text-dim); line-height: 1.3;">
            ${isPure ? '🔥 <strong>Sonido exclusivo:</strong> No hay falsos que lo compartan en misterio.' : `⚠️ <strong>Peligro:</strong> Comparte acústica física con otros ítems del juego.`}
            ${item.describe ? `<div style="margin-top: 0.25rem; font-style: italic; color: #94a3b8;">${item.describe}</div>` : ''}
          </div>

          <div class="red-card-actions">
            <button class="btn-mini-audio" data-file="${item.dropSound}" data-name="${item.nameEs} (Drop)">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              DROP
            </button>
            <button class="btn-mini-audio" data-file="${item.pickupSound}" data-name="${item.nameEs} (Pickup)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
              PICKUP
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Asignar eventos de audio
    grid.querySelectorAll('.btn-mini-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        playSynthSFX('click');
        const file = btn.getAttribute('data-file');
        const name = btn.getAttribute('data-name');
        playSoundFile(file, name, 'Muestra acústica de ítem rojo');
      });
    });
  }

  // ==========================================================================
  // VISTA 4: COMPARADOR ACÚSTICO A / B
  // ==========================================================================
  const COMPARE_PRESETS = {
    lion_vs_cheetah: {
      itemA: { id: 408080008, title: 'Estatua de León Dorado (Rojo)', desc: 'Objeto de 3x2. Pesa en el inventario. Sonido profundo de escultura maciza.' },
      itemB: { id: 408080036, title: 'Estatua de Guepardo Dorado (Dorado)', desc: 'Objeto de 2x2. Mismo archivo acústico #28, ¡pero NUNCA cabe en una caja de 3x2!' }
    },
    vase_vs_mutant: {
      itemA: { id: 408080003, title: 'Jarrón de Porcelana (Vase - Rojo)', desc: 'Valor: 1,373,625 K. Tintineo cristalino agudo de alta resonancia (#30).' },
      itemB: { id: 408070001, title: 'Muestra de Corazón Mutante (Dorado)', desc: 'Frasco de vidrio biológico con muestra médica. Comparte el tintineo de vidrio.' }
    },
    ti_vs_circuit: {
      itemA: { id: 408120013, title: 'Módulo TI (Rojo - 1.33M Koens)', desc: 'Tamaño: 2x1. Dispositivo militar de computación táctica (#10).' },
      itemB: { id: 408030008, title: 'Hebra de Paladio / Chip (Morado)', desc: 'Piezas técnicas baratas de bajo valor que emiten el mismo clic táctico.' }
    },
    mask_vs_scissors: {
      itemA: { id: 498080006, title: 'Réplica Máscara de Oro Antigua (Rojo)', desc: 'Valor: 1,647,474 K. Tintineo metálico de alta frecuencia (#22).' },
      itemB: { id: 408070009, title: 'Tijeras Médicas (Gris / Común)', desc: 'Instrumento metálico fino. ¡El sonido #22 tiene más de 20 trampas!' }
    },
    lute_vs_monitor: {
      itemA: { id: 498080025, title: 'Laúd de Doble Mástil (Rojo - 1.54M K)', desc: 'Tamaño: 2x3. Caja armónica de madera gigante (#14).' },
      itemB: { id: 408140004, title: 'Monitor de Estudio de Audio (Dorado)', desc: 'Gabinete de altavoz de madera pesada de 2x2.' }
    }
  };

  function updateComparePreset(key) {
    const preset = COMPARE_PRESETS[key] || COMPARE_PRESETS.lion_vs_cheetah;
    const itA = ABI_DATA.items.find(it => it.id === preset.itemA.id);
    const itB = ABI_DATA.items.find(it => it.id === preset.itemB.id);

    if (!itA || !itB) return;

    // Slot A
    const imgA = document.getElementById('slot-a-img');
    const nameA = document.getElementById('slot-a-name');
    const descA = document.getElementById('slot-a-desc');
    const btnA = document.getElementById('btn-play-slot-a');

    if (imgA) imgA.src = itA.iconUrl;
    if (nameA) nameA.textContent = preset.itemA.title;
    if (descA) descA.textContent = preset.itemA.desc;
    if (btnA) {
      btnA.onclick = () => {
        playSynthSFX('click');
        playSoundFile(itA.dropSound, preset.itemA.title, 'Drop Ítem A (Rojo)');
      };
    }

    // Slot B
    const imgB = document.getElementById('slot-b-img');
    const nameB = document.getElementById('slot-b-name');
    const descB = document.getElementById('slot-b-desc');
    const btnB = document.getElementById('btn-play-slot-b');

    if (imgB) imgB.src = itB.iconUrl;
    if (nameB) nameB.textContent = preset.itemB.title;
    if (descB) descB.textContent = preset.itemB.desc;
    if (btnB) {
      btnB.onclick = () => {
        playSynthSFX('click');
        playSoundFile(itB.dropSound, preset.itemB.title, 'Drop Ítem B (Comparación)');
      };
    }

    // Botón de secuencia
    const btnSeq = document.getElementById('btn-play-compare-sequence');
    if (btnSeq) {
      btnSeq.onclick = () => {
        playSynthSFX('click');
        playSoundFile(itA.dropSound, preset.itemA.title, 'Sonando Ítem A (Rojo)...');
        setTimeout(() => {
          playSoundFile(itB.dropSound, preset.itemB.title, 'Sonando Ítem B (Comparación)...');
        }, 1200);
      };
    }
  }

  // ==========================================================================
  // VISTA 5: TABLA DE SONIDOS CLAVE (CHEAT SHEET)
  // ==========================================================================
  function renderCheatSheet() {
    const tbody = document.getElementById('cheat-sheet-tbody');
    if (!tbody) return;

    const sounds = ABI_DATA.sounds.filter(s => s.hasRed);

    tbody.innerHTML = sounds.map(sound => {
      const redNames = sound.redItems.map(r => r.nameEs).join(', ');
      const certaintyBadge = sound.isGuaranteedRed 
        ? '<span style="color: var(--rarity-red); font-weight: 700;">🔥 100% GARANTIZADO</span>' 
        : `<span style="color: var(--accent-gold);">${sound.redRatio}% (${sound.redCount} de ${sound.totalItems})</span>`;

      return `
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <td style="padding: 10px; font-family: var(--font-mono); font-weight: 700; color: var(--accent-gold);">#${sound.id}</td>
          <td style="padding: 10px;">
            <strong>${sound.name}</strong><br>
            <small style="color: var(--text-muted);">${sound.description}</small>
          </td>
          <td style="padding: 10px; color: #fff;">
            ${redNames}
          </td>
          <td style="padding: 10px;">
            ${certaintyBadge}
          </td>
          <td style="padding: 10px;">
            <button class="btn-mini-audio" data-file="${sound.drop}" data-name="Cheat Sheet #${sound.id}">
              🔊 Drop
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-mini-audio').forEach(btn => {
      btn.addEventListener('click', () => {
        playSynthSFX('click');
        const file = btn.getAttribute('data-file');
        const name = btn.getAttribute('data-name');
        playSoundFile(file, name, 'Muestra Cheat Sheet');
      });
    });
  }

  // ==========================================================================
  // VISTA RADAR: DETECTOR ACÚSTICO AUTOMÁTICO EN VIVO (SHAZAM TÁCTICO)
  // ==========================================================================
  // 24 Frecuencias logarítmicas calibradas para la acústica física de los ítems de ABI:
  // Desde impactos sordos de madera/plástico hasta resonancias de porcelana (4.2k/5.1k) y metales (1.35k/6.4k)
  const RADAR_FREQS = [
    90,    // Sub-impact (Contenedor pesado / Madera gruesa)
    140,   // Low-bass (Caja grande de armas / Suministros)
    220,   // Bass (Plástico pesado / Tambor)
    320,   // Low-mid (Madera media / Cajas médicas)
    460,   // Mid-low (Radio militar / Componentes mecánicos)
    650,   // Mid (Cajas metálicas / Baterías)
    850,   // Mid-high (Secret Document textura de papel / Fricción)
    1050,  // León Dorado cuerpo (Estatua pesada)
    1350,  // Resonancia metálica primaria (León de Oro / Guepardo)
    1650,  // Clic módulo TI #1 / Chips militares
    2050,  // Clic módulo TI #2 / Transistor cerámico
    2500,  // Papel crujiente agudo (Secret Document / Mapas / Planos)
    2950,  // Vidrio grueso / Matraz mutante
    3450,  // Resonancia cerámica baja / Tetera pre-impacto
    4200,  // RESONANCIA TETERA ANTIGUA (Prop_Acc_Teapot pico armónico)
    4650,  // Vidrio brillante
    5100,  // RESONANCIA JARRÓN DE PORCELANA (Vase - Tintineo cristalino)
    5700,  // Metal fino / Instrumentos
    6400,  // MÁSCARA DORADA (Prop_Acc_Goldmask tintineo de oro fino)
    7400,  // Cadena de oro / Collar
    8800,  // Monedas / Oro tintineo alto
    10200, // Armónico superior de porcelana y metal
    11800, // Brillo metálico
    13800  // Aire y transitorio de ataque de arrastre
  ];

  function goertzelEnergy(samples, targetFreq, sampleRate) {
    const k = Math.round((samples.length * targetFreq) / sampleRate);
    const omega = (2 * Math.PI * k) / samples.length;
    const coeff = 2 * Math.cos(omega);
    let s0 = 0, s1 = 0, s2 = 0;

    for (let i = 0; i < samples.length; i++) {
      s0 = samples[i] + coeff * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    return Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2);
  }

  // Helper: Extraer energía Goertzel en una ventana con ventana Hann aplicada
  function computeWindowEnergyVector(samples, offset, length, sampleRate, noiseSpectrum) {
    const N = Math.min(length, samples.length - offset);
    if (N <= 0) return new Float32Array(RADAR_FREQS.length);

    const windowed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
      windowed[i] = samples[offset + i] * hann;
    }

    const vec = new Float32Array(RADAR_FREQS.length);
    let sum = 0;
    for (let f = 0; f < RADAR_FREQS.length; f++) {
      let e = Math.sqrt(goertzelEnergy(windowed, RADAR_FREQS[f], sampleRate));
      // Sustracción espectral de ruido ambiental si está calibrado
      if (noiseSpectrum && noiseSpectrum[f] > 0) {
        e = Math.max(0, e - (noiseSpectrum[f] * 1.25));
      }
      vec[f] = e;
      sum += e;
    }

    if (sum > 0) {
      for (let f = 0; f < vec.length; f++) {
        vec[f] /= sum;
      }
    }
    return vec;
  }

  // Extraer huella acústica multi-fase espectro-temporal (3 Slices ST-Fingerprint + 16-point Decay Envelope)
  function extractAcousticFeatures(samples, sampleRate, noiseSpectrum = null) {
    // 1. Encontrar el pico de impacto transitorio (ataque de pickup o drop)
    let peakIdx = 0;
    let maxAmp = 0;
    const scanLen = Math.min(samples.length, Math.round(sampleRate * 0.9));
    for (let i = 0; i < scanLen; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > maxAmp) {
        maxAmp = abs;
        peakIdx = i;
      }
    }

    // 2. Multi-Fase Temporal (3 Slices ST-Fingerprint):
    // Slice 1: Ataque Mecánico Transitorio (0 a 35 ms)
    const slice1Offset = Math.max(0, peakIdx - 128);
    const slice1Len = Math.min(1536, samples.length - slice1Offset);
    const slice1 = computeWindowEnergyVector(samples, slice1Offset, slice1Len, sampleRate, noiseSpectrum);

    // Slice 2: Resonancia Física del Material (35 a 100 ms) — La firma acústica más pura
    const slice2Offset = Math.min(samples.length - 1, peakIdx + 384);
    const slice2Len = Math.min(3072, samples.length - slice2Offset);
    const slice2 = computeWindowEnergyVector(samples, slice2Offset, slice2Len, sampleRate, noiseSpectrum);

    // Slice 3: Cola de Decaimiento y Reverberación (100 a 200 ms)
    const slice3Offset = Math.min(samples.length - 1, peakIdx + 2560);
    const slice3Len = Math.min(3072, samples.length - slice3Offset);
    const slice3 = computeWindowEnergyVector(samples, slice3Offset, slice3Len, sampleRate, noiseSpectrum);

    // 3. Envolvente de Decaimiento Temporal Normalizada de 16 Puntos (Decay Envelope)
    const env16 = new Float32Array(16);
    const envStart = Math.max(0, peakIdx - 256);
    const stepSize = Math.floor(Math.min(samples.length - envStart, 8192) / 16);
    let maxEnv = 0;

    if (stepSize > 0) {
      for (let k = 0; k < 16; k++) {
        let sumSq = 0;
        const bStart = envStart + (k * stepSize);
        const bEnd = Math.min(samples.length, bStart + stepSize);
        const count = Math.max(1, bEnd - bStart);
        for (let i = bStart; i < bEnd; i++) {
          sumSq += samples[i] * samples[i];
        }
        const rms = Math.sqrt(sumSq / count);
        env16[k] = rms;
        if (rms > maxEnv) maxEnv = rms;
      }
      if (maxEnv > 0) {
        for (let k = 0; k < 16; k++) env16[k] /= maxEnv;
      }
    }

    // 4. Parámetros Físicos del Cuerpo Resonante (Slice 2):
    let weightedFreq = 0;
    let highFreqSum = 0;
    let lowFreqSum = 0;
    let logSum = 0;
    let maxBandVal = 0;
    let maxBandIdx = 0;

    for (let f = 0; f < RADAR_FREQS.length; f++) {
      const p = slice2[f];
      weightedFreq += RADAR_FREQS[f] * p;
      if (RADAR_FREQS[f] >= 3400) highFreqSum += p;
      if (RADAR_FREQS[f] <= 900) lowFreqSum += p;
      logSum += Math.log(Math.max(1e-6, p));
      if (p > maxBandVal) {
        maxBandVal = p;
        maxBandIdx = f;
      }
    }

    const geometricMean = Math.exp(logSum / RADAR_FREQS.length);
    const arithmeticMean = (1.0 / RADAR_FREQS.length) || 1e-6;
    const spectralFlatness = geometricMean / arithmeticMean;

    return {
      slice1: slice1,
      slice2: slice2,
      slice3: slice3,
      vector: slice2, // compatibilidad directa
      env16: env16,
      centroid: weightedFreq,
      highRatio: (highFreqSum + 0.001) / (lowFreqSum + 0.001),
      spectralFlatness: spectralFlatness,
      dominantFreq: RADAR_FREQS[maxBandIdx]
    };
  }

  function computeCosineSimilarity(v1, v2) {
    if (!v1 || !v2 || v1.length !== v2.length) return 0;
    let dot = 0, mag1 = 0, mag2 = 0;
    for (let i = 0; i < v1.length; i++) {
      dot += v1[i] * v2[i];
      mag1 += v1[i] * v1[i];
      mag2 += v2[i] * v2[i];
    }
    const denom = Math.sqrt(mag1) * Math.sqrt(mag2);
    return denom > 0 ? (dot / denom) : 0;
  }

  function computePearsonCorrelation(arr1, arr2) {
    if (!arr1 || !arr2 || arr1.length !== arr2.length || arr1.length === 0) return 0;
    const n = arr1.length;
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < n; i++) {
      sum1 += arr1[i];
      sum2 += arr2[i];
    }
    const mean1 = sum1 / n;
    const mean2 = sum2 / n;
    let num = 0, den1 = 0, den2 = 0;
    for (let i = 0; i < n; i++) {
      const d1 = arr1[i] - mean1;
      const d2 = arr2[i] - mean2;
      num += d1 * d2;
      den1 += d1 * d1;
      den2 += d2 * d2;
    }
    const denom = Math.sqrt(den1) * Math.sqrt(den2);
    if (denom <= 1e-9) return 0;
    return Math.max(0, num / denom);
  }

  function scoreTemplateSimilarity(liveFeat, tmplFeat) {
    // 1. Similitud Multi-Slice Espectro-Temporal:
    const simSlice1 = computeCosineSimilarity(liveFeat.slice1, tmplFeat.slice1); // Ataque (0-35ms)
    const simSlice2 = computeCosineSimilarity(liveFeat.slice2, tmplFeat.slice2); // Resonancia Cuerpo (35-100ms)
    const simSlice3 = computeCosineSimilarity(liveFeat.slice3, tmplFeat.slice3); // Cola Decaimiento (100-200ms)

    // 2. Correlación de Envolvente Temporal de 16 Puntos (Decay Rate Envelope):
    const envCorr = computePearsonCorrelation(liveFeat.env16, tmplFeat.env16);

    // 3. Similitud de Centroide y Brillo Espectral:
    const centDiff = Math.abs(liveFeat.centroid - tmplFeat.centroid);
    const centSim = Math.max(0, 1 - (centDiff / 4200));

    // Ponderación Acústica de Precisión Quirúrgica:
    // El cuerpo resonante (Slice 2) tiene el 40% del peso; Envolvente de decaimiento 20%; Ataque 15%; Cola 15%; Centroide 10%
    let score = (simSlice2 * 0.40) + (envCorr * 0.20) + (simSlice1 * 0.15) + (simSlice3 * 0.15) + (centSim * 0.10);

    // Si coincide el pico resonante dominante entre audio en vivo y plantilla
    if (liveFeat.dominantFreq === tmplFeat.dominantFreq) {
      score += 0.04;
    }

    // Refuerzo por Resonancias Físicas Frecuenciales Únicas de Ítems Clave en ABI:
    const soundId = tmplFeat.sound.id;

    // Tetera Antigua (ID 32) -> Fuerte pico en 4200 Hz
    if (soundId === 32 && liveFeat.dominantFreq >= 3800 && liveFeat.dominantFreq <= 4500) {
      score += 0.08;
    }
    // Jarrón Porcelana (ID 30) -> Tintineo agudo en 5100 Hz
    if (soundId === 30 && liveFeat.dominantFreq >= 4800 && liveFeat.dominantFreq <= 5400) {
      score += 0.08;
    }
    // León Dorado (ID 28) -> Resonancia pesada en 1350 Hz
    if (soundId === 28 && liveFeat.dominantFreq >= 1150 && liveFeat.dominantFreq <= 1550) {
      score += 0.07;
    }
    // Máscara Dorada (ID 29) -> Tintineo de oro fino en 6400 Hz
    if (soundId === 29 && liveFeat.dominantFreq >= 5800 && liveFeat.dominantFreq <= 7000) {
      score += 0.07;
    }
    // Módulo TI & Módulo posición obj. (ID 10) -> Clics electrónicos secos en 1650/2050 Hz
    if (soundId === 10 && ((liveFeat.dominantFreq >= 1500 && liveFeat.dominantFreq <= 1800) || (liveFeat.dominantFreq >= 1950 && liveFeat.dominantFreq <= 2200))) {
      score += 0.07;
    }
    // Laúd Doble Cuerda (ID 14) -> Resonancia de madera acústica en 220-460 Hz
    if (soundId === 14 && liveFeat.dominantFreq >= 200 && liveFeat.dominantFreq <= 500) {
      score += 0.07;
    }
    // Flauta Esmeralda (ID 25) -> Timbre de viento / tubo resonante en 1050-2050 Hz
    if (soundId === 25 && liveFeat.dominantFreq >= 950 && liveFeat.dominantFreq <= 2200) {
      score += 0.07;
    }
    // EMS (ID 18) -> Clic metálico romo pequeño
    if (soundId === 18 && liveFeat.dominantFreq >= 2500 && liveFeat.dominantFreq <= 4600) {
      score += 0.06;
    }
    // Documento Secreto / Planos (ID 1 / ID 35) -> Alta planicidad espectral (fricción de papel sin resonancia metálica)
    if ((soundId === 1 || soundId === 35) && liveFeat.spectralFlatness > 0.30) {
      score += 0.08;
    }

    return Math.min(0.99, score);
  }

  // Precargar las 76 firmas acústicas calibradas (Carga instantánea precomputada con fallback)
  async function preloadRadarTemplates() {
    if (state.radar.templatesLoaded || state.radar.isPreloading) return;
    state.radar.isPreloading = true;

    const statusEl = document.getElementById('radar-status-text');
    if (statusEl) statusEl.textContent = 'CARGANDO 76 FIRMAS ACÚSTICAS (0ms DSP)...';

    // 1. Carga instantánea desde radar_signatures.json precompilado
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
        console.log(`[Radar] 76 firmas acústicas cargadas instantáneamente desde radar_signatures.json`);
        return;
      }
    } catch (e) {
      console.warn('Fallo cargando radar_signatures.json, usando decodificación dinámica:', e);
    }

    // 2. Fallback dinámico original si no existiera el archivo
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const tempCtx = new AudioCtx();

    const sounds = ABI_DATA.sounds;
    let loadedCount = 0;
    const totalFiles = sounds.length * 2; // 38 drops + 38 pickups = 76

    for (const sound of sounds) {
      // Cargar sonido DROP (Soltar)
      try {
        const respDrop = await fetch(`audio/${sound.drop}.ogg`);
        const abDrop = await respDrop.arrayBuffer();
        const bufDrop = await tempCtx.decodeAudioData(abDrop);
        const featDrop = extractAcousticFeatures(bufDrop.getChannelData(0), bufDrop.sampleRate, null);
        state.radar.templates.push({
          sound: sound,
          action: 'drop',
          file: sound.drop,
          slice1: featDrop.slice1,
          slice2: featDrop.slice2,
          slice3: featDrop.slice3,
          env16: featDrop.env16,
          vector: featDrop.vector,
          centroid: featDrop.centroid,
          highRatio: featDrop.highRatio,
          spectralFlatness: featDrop.spectralFlatness,
          dominantFreq: featDrop.dominantFreq
        });
        loadedCount++;
      } catch (err) {
        console.warn('Error precargando drop:', sound.drop, err);
      }

      // Cargar sonido PICKUP (Arrastrar)
      try {
        const respUp = await fetch(`audio/${sound.pickup}.ogg`);
        const abUp = await respUp.arrayBuffer();
        const bufUp = await tempCtx.decodeAudioData(abUp);
        const featUp = extractAcousticFeatures(bufUp.getChannelData(0), bufUp.sampleRate, null);
        state.radar.templates.push({
          sound: sound,
          action: 'pickup',
          file: sound.pickup,
          slice1: featUp.slice1,
          slice2: featUp.slice2,
          slice3: featUp.slice3,
          env16: featUp.env16,
          vector: featUp.vector,
          centroid: featUp.centroid,
          highRatio: featUp.highRatio,
          spectralFlatness: featUp.spectralFlatness,
          dominantFreq: featUp.dominantFreq
        });
        loadedCount++;
      } catch (err) {
        console.warn('Error precargando pickup:', sound.pickup, err);
      }

      if (statusEl) {
        statusEl.textContent = `CALIBRANDO FIRMAS ACÚSTICAS (${loadedCount}/${totalFiles})...`;
      }
    }

    state.radar.templatesLoaded = true;
    state.radar.isPreloading = false;
    if (statusEl) {
      statusEl.textContent = state.radar.active ? 'RADAR ACTIVO — ESCUCHANDO RAID (DSP ALTA PRECISIÓN)' : 'RADAR LISTO (76 FIRMAS) — HAZ CLIC EN ACTIVAR';
    }
  }

  // Calibración automática del ruido de fondo ambiental del juego con sustracción espectral
  async function autoCalibrateRadarNoise() {
    if (!state.radar.active) {
      alert('Activa primero el radar acústico para poder medir el ruido de fondo de tu juego.');
      return;
    }

    const statusText = document.getElementById('radar-status-text');
    const beacon = document.getElementById('radar-beacon');

    if (statusText) statusText.textContent = '🎯 MIDIENDO RUIDO AMBIENTAL (QUÉDATE EN SILENCIO 2 SEG)...';
    if (beacon) beacon.className = 'status-beacon detecting';

    playSynthSFX('click');
    state.radar.isCalibrating = true;

    let noiseRmsSamples = [];
    const noiseFreqAccum = new Float32Array(RADAR_FREQS.length);
    let accumCount = 0;
    const startTime = Date.now();
    const sampleRate = (state.radar.audioContext && state.radar.audioContext.sampleRate) || 48000;

    const calInterval = setInterval(() => {
      if (state.radar.currentRms > 0) {
        noiseRmsSamples.push(state.radar.currentRms);
      }

      // Muestrear el espectro ambiental de las últimas 2048 muestras
      const ring = state.radar.ringBuffer;
      const ringLen = ring.length;
      const wIdx = state.radar.ringWriteIdx;
      const tempBlock = new Float32Array(2048);
      for (let i = 0; i < 2048; i++) {
        tempBlock[i] = ring[(wIdx - 2048 + i + ringLen) % ringLen];
      }

      for (let f = 0; f < RADAR_FREQS.length; f++) {
        const p = Math.sqrt(goertzelEnergy(tempBlock, RADAR_FREQS[f], sampleRate));
        noiseFreqAccum[f] += p;
      }
      accumCount++;

      if (Date.now() - startTime >= 1800) {
        clearInterval(calInterval);
        state.radar.isCalibrating = false;

        let avgNoise = 0.003;
        if (noiseRmsSamples.length > 0) {
          avgNoise = noiseRmsSamples.reduce((a, b) => a + b, 0) / noiseRmsSamples.length;
        }

        // Promediar y normalizar el vector de ruido de fondo para sustracción espectral
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

        // Umbral inteligente: 2.2x ruido ambiente + margen de seguridad
        const optThreshold = Math.min(0.050, Math.max(0.005, Number((avgNoise * 2.2 + 0.003).toFixed(3))));
        state.radar.threshold = optThreshold;

        // Actualizar UI del Slider y Selector
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

  // ==========================================================================
  // MOTOR DE VISIÓN MULTIMODAL (ANÁLISIS DE PANTALLA EN TIEMPO REAL)
  // ==========================================================================
  function startVisionTracking(stream) {
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
    videoEl.play().catch(e => console.warn('Error iniciando video monitor:', e));

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

  function stopVisionTracking() {
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
    // Limitar procesamiento a ~20 FPS (cada 48ms) para impacto 0% en CPU
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
      let minX = canvas.width, maxX = 0;
      let minY = canvas.height, maxY = 0;

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

      // Cluster de movimiento localizado (objeto moviéndose con ratón en inventario)
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
        // DETECCIÓN DE SOLTADO (DROP): El objeto fue soltado en inventario
        const dragDuration = Date.now() - state.vision.dragStartTimestamp;
        state.vision.isDragging = false;

        if (dragDuration > 120) {
          state.vision.lastDropTimestamp = Date.now();
          const finalSize = state.vision.detectedSize;

          if (visionDot) visionDot.className = 'vision-dot drop';
          if (visionText) {
            visionText.textContent = `¡SOLTADO VISUAL [${finalSize !== 'all' ? finalSize : 'Auto'}]!`;
          }

          if (finalSize !== 'all') {
            state.radar.selectedSize = finalSize;
            const sizeSelect = document.getElementById('radar-size-filter');
            if (sizeSelect) sizeSelect.value = finalSize;
          }

          // Si hay una captura diferida en progreso, evaluar transitorio de inmediato
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

  // ==========================================================================
  // HUD FLOTANTE (DOCUMENT PICTURE-IN-PICTURE ALWAYS-ON-TOP)
  // ==========================================================================
  async function toggleRadarPiP() {
    if ('documentPictureInPicture' in window) {
      if (state.vision.pipWindow) {
        state.vision.pipWindow.close();
        state.vision.pipWindow = null;
        const pipBtn = document.getElementById('btn-toggle-pip');
        if (pipBtn) pipBtn.classList.remove('active');
        return;
      }

      try {
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 360,
          height: 195
        });
        state.vision.pipWindow = pipWin;

        const style = pipWin.document.createElement('style');
        style.textContent = `
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #070a0f; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 10px; overflow: hidden; border: 1.5px solid #06b6d4; border-radius: 8px; user-select: none;
          }
          .pip-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px; }
          .pip-title { font-family: monospace; font-size: 11px; font-weight: 700; color: #06b6d4; letter-spacing: 0.8px; }
          .pip-pill { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; }
          .pip-pill.red { background: rgba(239, 68, 68, 0.25); color: #ef4444; border: 1px solid #ef4444; }
          .pip-pill.gold { background: rgba(245, 158, 11, 0.25); color: #f59e0b; border: 1px solid #f59e0b; }
          .pip-pill.idle { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
          .pip-body { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
          .pip-img { width: 54px; height: 54px; border-radius: 6px; border: 1px solid #334155; object-fit: contain; background: #0b111e; flex-shrink: 0; }
          .pip-info { flex: 1; min-width: 0; }
          .pip-name { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .pip-price { font-family: monospace; color: #10b981; font-size: 11px; margin-top: 2px; }
          .pip-meta { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 4px; }
          .pip-meter-bg { width: 100%; height: 4px; background: #1e293b; border-radius: 2px; margin-top: 8px; overflow: hidden; }
          .pip-meter-fill { width: 0%; height: 100%; background: #06b6d4; transition: width 0.08s ease; }
        `;
        pipWin.document.head.appendChild(style);

        pipWin.document.body.innerHTML = `
          <div class="pip-head">
            <span class="pip-title">ABI RADAR TÁCTICO</span>
            <span class="pip-pill idle" id="pip-pill">ESCUCHANDO</span>
          </div>
          <div class="pip-body">
            <img class="pip-img" id="pip-img" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='54' height='54' fill='%231e293b'><rect width='54' height='54'/></svg>" alt="" />
            <div class="pip-info">
              <div class="pip-name" id="pip-name">Esperando Drop en Raid...</div>
              <div class="pip-price" id="pip-price">-- Koens</div>
              <div class="pip-meta">
                <span id="pip-size">Casilla: Auto</span>
                <span id="pip-conf">Certeza: --</span>
              </div>
            </div>
          </div>
          <div class="pip-meter-bg">
            <div class="pip-meter-fill" id="pip-meter"></div>
          </div>
        `;

        pipWin.addEventListener('pagehide', () => {
          state.vision.pipWindow = null;
          const pipBtn = document.getElementById('btn-toggle-pip');
          if (pipBtn) pipBtn.classList.remove('active');
        });

        const pipBtn = document.getElementById('btn-toggle-pip');
        if (pipBtn) pipBtn.classList.add('active');

      } catch (err) {
        console.warn('No se pudo abrir Document PiP:', err);
      }
    } else {
      alert('Tu navegador no soporta Document Picture-in-Picture. Te recomendamos Google Chrome o Microsoft Edge para tener la ventana táctica flotante sobre tu juego.');
    }
  }

  function updatePiPHUD(item, sound, confidence) {
    const win = state.vision.pipWindow;
    if (!win || win.closed) return;

    const doc = win.document;
    const pill = doc.getElementById('pip-pill');
    const img = doc.getElementById('pip-img');
    const name = doc.getElementById('pip-name');
    const price = doc.getElementById('pip-price');
    const size = doc.getElementById('pip-size');
    const conf = doc.getElementById('pip-conf');

    if (sound.isGuaranteedRed) {
      if (pill) { pill.className = 'pip-pill red'; pill.textContent = '🔴 100% ROJO'; }
    } else if (sound.hasRed) {
      if (pill) { pill.className = 'pip-pill gold'; pill.textContent = `🟡 ${sound.redRatio}% ROJO`; }
    } else {
      if (pill) { pill.className = 'pip-pill idle'; pill.textContent = '⚪ DESCARTAR'; }
    }

    if (img && item && item.iconUrl) img.src = item.iconUrl;
    if (name && item) name.textContent = item.nameEs || item.name;
    if (price && item) price.textContent = `~${(item.referencePrice || 0).toLocaleString()} Koens`;
    if (size && item) size.textContent = `[${item.sizeLabel || '1x1'}]`;
    if (conf) conf.textContent = `${confidence}% Certeza`;
  }

  async function toggleRadarCapture() {
    playSynthSFX('click');
    const toggleBtn = document.getElementById('btn-toggle-radar');
    const toggleText = document.getElementById('btn-toggle-radar-text');
    const beacon = document.getElementById('radar-beacon');
    const statusText = document.getElementById('radar-status-text');
    const rateInfo = document.getElementById('radar-rate-info');

    // Si ya está activo -> Detener
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

    // Si está inactivo -> Iniciar captura
    if (!state.radar.templatesLoaded) {
      await preloadRadarTemplates();
    }

    try {
      let stream = null;
      const mode = state.radar.sourceMode;

      if (mode === 'system') {
        // Captura directa de audio y pantalla del sistema (100% digital puro)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          alert('Tu navegador no soporta captura de audio del sistema. Usa la opción de Micrófono / Mezcla Estéreo.');
          return;
        }
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'monitor' },
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });

        // Verificar que el usuario marcó la casilla de audio
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          stream.getTracks().forEach(t => t.stop());
          alert('IMPORTANTE: Al compartir pantalla, debes marcar la casilla "Compartir también el audio del sistema" para que el radar pueda escuchar el juego.');
          return;
        }

        // Si la visión está activa, mantener el stream de video; si no, apagarlo
        if (state.vision.mode === 'auto') {
          startVisionTracking(stream);
        } else {
          stream.getVideoTracks().forEach(t => t.stop());
        }
      } else {
        // Captura vía Micrófono / Stereo Mix
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          alert('Tu navegador no tiene acceso a dispositivos de audio.');
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
      }

      state.radar.stream = stream;

      // Crear o reanudar AudioContext
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!state.radar.audioContext) {
        state.radar.audioContext = new AudioCtx();
      }
      if (state.radar.audioContext.state === 'suspended') {
        await state.radar.audioContext.resume();
      }

      state.radar.sourceNode = state.radar.audioContext.createMediaStreamSource(stream);

      // Etapa de Ganancia DSP (Amplificador de audio de juego para captar drops sutiles)
      state.radar.gainNode = state.radar.audioContext.createGain();
      state.radar.gainNode.gain.value = state.radar.gainBoost;

      // Analizador de visualización para el osciloscopio
      state.radar.analyserNode = state.radar.audioContext.createAnalyser();
      state.radar.analyserNode.fftSize = 2048;
      state.radar.analyserNode.smoothingTimeConstant = 0.08;

      // Conexión del grafo visual: Fuente -> Ganancia DSP -> Analizador
      state.radar.sourceNode.connect(state.radar.gainNode);
      state.radar.gainNode.connect(state.radar.analyserNode);

      // ScriptProcessorNode para captura PCM contigua y sin pérdida de muestras
      const scriptNode = state.radar.audioContext.createScriptProcessor(2048, 1, 1);
      const silentGain = state.radar.audioContext.createGain();
      silentGain.gain.value = 0; // Mute absoluto para evitar eco o feedback en los altavoces

      state.radar.gainNode.connect(scriptNode);
      scriptNode.connect(silentGain);
      silentGain.connect(state.radar.audioContext.destination);

      state.radar.scriptNode = scriptNode;
      state.radar.silentGain = silentGain;

      state.radar.active = true;
      state.radar.movingAvgRms = 0.003;
      state.radar.ringWriteIdx = 0;
      state.radar.pendingCapture = null;

      // PROCESAMIENTO PCM CONTIGUO EN TIEMPO REAL:
      scriptNode.onaudioprocess = (e) => {
        if (!state.radar.active) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // 1. Escribir exactamente 2048 muestras continuas en el ringBuffer
        const ring = state.radar.ringBuffer;
        const ringLen = ring.length;
        let wIdx = state.radar.ringWriteIdx;
        for (let i = 0; i < inputData.length; i++) {
          ring[(wIdx + i) % ringLen] = inputData[i];
        }
        state.radar.ringWriteIdx = (wIdx + inputData.length) % ringLen;

        // 2. Calcular RMS del bloque y RMS transitorio de corto plazo (últimas 256 muestras)
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

        // Actualizar promedio móvil del piso de ruido ambiental (si no está calibrando ni en captura diferida)
        if (!state.radar.isCalibrating && !state.radar.pendingCapture) {
          state.radar.movingAvgRms = (state.radar.movingAvgRms * 0.94) + (rms * 0.06);
        }

        const now = Date.now();

        // 3. Si hay una captura diferida en progreso (esperando a que el sonido complete su resonancia física)
        if (state.radar.pendingCapture) {
          state.radar.pendingCapture.samplesRemaining -= inputData.length;
          if (state.radar.pendingCapture.samplesRemaining <= 0) {
            const trigIdx = state.radar.pendingCapture.triggerIdx;
            state.radar.pendingCapture = null;
            state.radar.cooldownUntil = now + 400; // Cooldown corto de 400ms

            // Reconstruir ventana de 8,192 muestras (~170ms) centrada en el transitorio:
            // 2,048 muestras antes del pico (pre-trigger) + 6,144 muestras de resonancia física real
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

        // 4. Detección de Disparo Transitorio Inteligente (Ataque de Arrastre o Soltado):
        const isDynamicSpike = (shortRms > state.radar.movingAvgRms * 1.80 && shortRms >= 0.005);
        const isAbsoluteThreshold = (rms >= state.radar.threshold || shortRms >= state.radar.threshold);

        if ((isDynamicSpike || isAbsoluteThreshold) && now > state.radar.cooldownUntil && state.radar.templatesLoaded && !state.radar.isCalibrating) {
          // Iniciar captura diferida: esperar 5,120 muestras (~106ms) para que todo el timbre resuene en el buffer
          state.radar.pendingCapture = {
            triggerIdx: state.radar.ringWriteIdx,
            samplesRemaining: 5120
          };

          const beacon = document.getElementById('radar-beacon');
          const statusText = document.getElementById('radar-status-text');
          if (beacon) beacon.className = 'status-beacon detecting';
          if (statusText) statusText.textContent = '¡CAPTANDO HUELLA EN CURSO...! (DSP)';

          setTimeout(() => {
            if (beacon && state.radar.active) beacon.className = 'status-beacon active';
            if (statusText && state.radar.active) statusText.textContent = 'RADAR ACTIVO — ESCUCHANDO RAID (DSP CONTINUO)';
          }, 500);
        }
      };

      if (toggleBtn) toggleBtn.classList.add('active');
      if (toggleText) toggleText.textContent = 'DETENER RADAR';
      if (beacon) beacon.className = 'status-beacon active';
      if (statusText) statusText.textContent = 'RADAR ACTIVO — ESCUCHANDO RAID (DSP CONTINUO)';
      if (rateInfo) rateInfo.textContent = `${(state.radar.audioContext.sampleRate / 1000).toFixed(1)} kHz • DSP x${state.radar.gainBoost}`;

      startRadarScope();

      // Si el usuario detiene la captura desde el banner de Chrome/Edge
      const primaryAudioTrack = stream.getAudioTracks()[0];
      if (primaryAudioTrack) {
        primaryAudioTrack.onended = () => {
          if (state.radar.active) toggleRadarCapture();
        };
      }

    } catch (err) {
      console.warn('Error al iniciar captura de audio para el radar:', err);
      if (err.name !== 'NotAllowedError') {
        alert(`No se pudo conectar el audio: ${err.message || err.name}`);
      }
      state.radar.active = false;
      if (beacon) beacon.className = 'status-beacon inactive';
      if (statusText) statusText.textContent = 'ERROR DE CAPTURA';
    }
  }

  function startRadarScope() {
    if (state.radar.animationId) return;

    const canvas = document.getElementById('radar-scope-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const timeFloatArray = new Float32Array(2048);
    const freqByteData = new Uint8Array(1024);

    function renderScope() {
      state.radar.animationId = requestAnimationFrame(renderScope);

      // Limpiar canvas con estela táctica
      ctx.fillStyle = 'rgba(4, 6, 9, 0.40)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = 68; // Centro de la mitad superior (Osciloscopio)
      const radius = 62;

      // Dibujar haz de radar giratorio
      state.radar.sweepAngle = (state.radar.sweepAngle + 0.038) % (Math.PI * 2);

      if (state.radar.active) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, state.radar.sweepAngle - 0.35, state.radar.sweepAngle);
        ctx.closePath();
        const sweepGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
        sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
        sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
        ctx.fillStyle = sweepGrad;
        ctx.fill();
        ctx.restore();
      }

      // Si el radar no está activo o no hay analizador, dibujar línea plana y salir
      if (!state.radar.active || !state.radar.analyserNode) {
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(canvas.width, cy);
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const meter = document.getElementById('radar-energy-meter');
        if (meter) meter.style.width = '0%';
        const liveRmsEl = document.getElementById('radar-live-rms');
        if (liveRmsEl) liveRmsEl.textContent = '0.000';
        return;
      }

      // Obtener muestras en coma flotante para osciloscopio
      state.radar.analyserNode.getFloatTimeDomainData(timeFloatArray);
      // Obtener espectro FFT para el ecualizador táctico inferior
      state.radar.analyserNode.getByteFrequencyData(freqByteData);

      const currentRms = state.radar.currentRms || 0;

      // Actualizar texto de nivel en vivo
      const liveRmsEl = document.getElementById('radar-live-rms');
      if (liveRmsEl) {
        liveRmsEl.textContent = currentRms.toFixed(3);
        if (currentRms >= state.radar.threshold) {
          liveRmsEl.style.color = '#ef4444';
        } else {
          liveRmsEl.style.color = 'var(--accent-cyan)';
        }
      }

      // Actualizar medidor VU visual
      const meter = document.getElementById('radar-energy-meter');
      if (meter) {
        const pct = Math.min(100, Math.round(((currentRms - 0.003) / (0.060 - 0.003)) * 100));
        meter.style.width = `${Math.max(0, pct)}%`;

        if (state.vision.pipWindow && !state.vision.pipWindow.closed) {
          const pipMeter = state.vision.pipWindow.document.getElementById('pip-meter');
          if (pipMeter) pipMeter.style.width = `${Math.max(0, pct)}%`;
        }
      }

      // 1. SECCIÓN SUPERIOR: OSCILOSCOPIO TÁCTICO CON ESTELA NEÓN (y: 0 a 135)
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = (currentRms > state.radar.threshold) ? '#ef4444' : '#10b981';

      const sliceWidth = canvas.width / timeFloatArray.length;
      let x = 0;

      for (let i = 0; i < timeFloatArray.length; i++) {
        const v = timeFloatArray[i];
        const y = cy + (v * 58);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      // 2. LÍNEA DIVISORIA HUD
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.20)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 138);
      ctx.lineTo(canvas.width, 138);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(6, 182, 212, 0.65)';
      ctx.font = '700 8px monospace';
      ctx.fillText('ESPECTRÓMETRO FÍSICO 24 BANDAS (DSP REAL-TIME)', 10, 147);

      // 3. SECCIÓN INFERIOR: ESPECTRÓMETRO TÁCTICO 24 BANDAS (y: 152 a 226)
      const numBands = RADAR_FREQS.length;
      const barTotalWidth = canvas.width / numBands;
      const barWidth = barTotalWidth - 3;
      const sampleRate = (state.radar.audioContext && state.radar.audioContext.sampleRate) || 48000;
      const baseBottomY = 222;

      for (let f = 0; f < numBands; f++) {
        const targetFreq = RADAR_FREQS[f];
        const bin = Math.min(1023, Math.round((targetFreq * 2048) / sampleRate));
        const rawEnergy = freqByteData[bin] / 255;

        // Suavizado dinámico
        state.radar.liveBandEnergies[f] = Math.max(rawEnergy, (state.radar.liveBandEnergies[f] || 0) * 0.82);
        // Retención de pico (peak hold)
        state.radar.liveBandPeaks[f] = Math.max(rawEnergy, (state.radar.liveBandPeaks[f] || 0) - 0.012);

        const energy = state.radar.liveBandEnergies[f];
        const barH = Math.max(2, energy * 68);
        const bx = f * barTotalWidth + 1.5;
        const by = baseBottomY - barH;

        // Resonancias clave de ítems rojos: Tetera (4200), Jarrón (5100), Oro (1350/6400), Módulo TI/Posición (1650/2050)
        const isKeyRedHarmonic = (targetFreq === 4200 || targetFreq === 5100 || targetFreq === 1350 || targetFreq === 6400 || targetFreq === 1650 || targetFreq === 2050);

        // Color de la barra
        if (isKeyRedHarmonic && energy > 0.25) {
          ctx.fillStyle = energy > 0.55 ? '#ef4444' : '#f59e0b'; // Rojo o Oro si resuena
        } else {
          ctx.fillStyle = energy > 0.45 ? '#06b6d4' : 'rgba(6, 182, 212, 0.55)';
        }

        ctx.fillRect(bx, by, barWidth, barH);

        // Dibujar punto de pico superior (Peak hold dot)
        const peakY = baseBottomY - Math.max(3, state.radar.liveBandPeaks[f] * 68);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx, peakY, barWidth, 1.5);
      }
    }

    renderScope();
  }

  function matchLiveRadarFeatures(liveFeat) {
    if (!state.radar.templates || state.radar.templates.length === 0) return;

    const mode = state.radar.detectMode || 'both';
    const sizeFilter = state.radar.selectedSize || 'all';

    // Filtrar templates según configuración (drop, pickup, o ambos)
    const eligibleTemplates = state.radar.templates.filter(tmpl => {
      if (mode === 'both' || mode === 'chain') return true;
      return tmpl.action === mode;
    });

    // Puntuar cada template
    const scores = eligibleTemplates.map(tmpl => {
      let sim = scoreTemplateSimilarity(liveFeat, tmpl);

      // Si el usuario especificó un tamaño de casilla (ej. 2x2, 1x2, 2x3, 1x3, 2x1),
      // otorgar un boost inteligente a los sonidos que contienen ítems rojos de ese tamaño exacto
      if (sizeFilter !== 'all') {
        const hasMatchingRed = (tmpl.sound.redItems || []).some(r => {
          const it = ABI_DATA.items.find(x => x.id === r.id);
          return it && it.sizeLabel === sizeFilter;
        });
        if (hasMatchingRed) {
          sim += 0.06;
        }
      }

      return {
        sound: tmpl.sound,
        action: tmpl.action,
        score: sim
      };
    });

    // Agrupar por ID de sonido para tomar el mejor score entre Drop y Pickup
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

    // Calcular porcentaje de certeza realista
    let conf = Math.min(99, Math.max(72, Math.round(topMatch.score * 100)));

    // Modo Doble Confirmación (Chain: Arrastrar -> Soltar dentro de 3.5s)
    if (mode === 'chain') {
      const now = Date.now();
      const last = state.radar.lastEvent;

      if (topMatch.action === 'pickup') {
        state.radar.lastEvent = { sound: topMatch.sound, action: 'pickup', time: now };
        const statusText = document.getElementById('radar-status-text');
        if (statusText) {
          statusText.textContent = `ARRASTRE DETECTADO (#${topMatch.sound.id} ${topMatch.sound.name.slice(0, 16)}) — SUELTA LA CAJA PARA CONFIRMAR...`;
        }
        return; // Esperar al drop para veredicto final
      } else if (topMatch.action === 'drop' && last && (now - last.time) < 3500) {
        if (last.sound.id === topMatch.sound.id) {
          conf = 99; // 99% de certeza absoluta por doble concordancia
          state.radar.lastEvent = null;
          displayRadarVerdict(topMatch.sound, conf, alternatives, 'chain');
          return;
        }
      }
    }

    displayRadarVerdict(topMatch.sound, conf, alternatives, topMatch.action);
  }

  function displayRadarVerdict(sound, confidence, alternatives = [], detectedAction = 'drop') {
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

    // 1. Obtener todos los ítems asociados a este sonido
    const allItems = ABI_DATA.items;
    const sizeFilter = state.radar.selectedSize || 'all';

    // Lista de ítems rojos de este sonido
    const redCandidates = (sound.redItems || []).map(r => allItems.find(it => it.id === r.id)).filter(Boolean);
    // Lista de otros ítems de este sonido (oro / comunes)
    const otherCandidates = (sound.items || []).map(o => allItems.find(it => it.id === o.id)).filter(it => it && !it.isRed);
    otherCandidates.sort((a, b) => (b.referencePrice || 0) - (a.referencePrice || 0));

    // 2. Determinar ítem principal a mostrar según filtro de tamaño seleccionado
    let representativeItem = null;

    if (sizeFilter !== 'all') {
      // Buscar primero si hay un rojo que coincida exactamente con el tamaño de casilla seleccionado
      representativeItem = redCandidates.find(it => it.sizeLabel === sizeFilter);
      if (!representativeItem) {
        // Si no hay rojo de ese tamaño, buscar en los otros ítems (ej. Antena en 2x2 para sonido #10)
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

    // Configurar banner según rareza
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

    // Actualizar HUD Flotante (Picture-in-Picture) si está activo
    updatePiPHUD(representativeItem, sound, confidence);

    // Recomendación táctica inteligente
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

    // 3. Renderizar Desglose por Tamaño de Casilla (CRUCIAL para no errar el ítem)
    if (altList) {
      // Agrupar ítems por tamaño
      const bySize = new Map();
      
      // Añadir rojos
      for (const r of redCandidates) {
        const sz = r.sizeLabel;
        if (!bySize.has(sz)) bySize.set(sz, []);
        bySize.get(sz).push({ item: r, isRed: true });
      }
      
      // Añadir candidatos notables de oro/chatarra (máx 4)
      for (const o of otherCandidates.slice(0, 4)) {
        const sz = o.sizeLabel;
        if (!bySize.has(sz)) bySize.set(sz, []);
        bySize.get(sz).push({ item: o, isRed: false });
      }

      let sizeRowsHtml = '';
      bySize.forEach((entries, sizeLabel) => {
        const isCurrentMatch = (representativeItem && representativeItem.sizeLabel === sizeLabel);
        const borderStyle = isCurrentMatch ? 'border: 1px solid var(--accent-gold); background: rgba(245, 158, 11, 0.12);' : 'border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.25);';

        const chipsHtml = entries.map(e => `
          <span class="radar-candidate-chip" data-item-id="${e.item.id}" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; ${e.isRed ? 'background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4);' : 'background: rgba(245, 158, 11, 0.15); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.3);'}">
            ${e.isRed ? '🔴' : '🟡'} <strong>${e.item.nameEs}</strong> <small style="opacity: 0.85;">(~${(e.item.referencePrice / 1000).toFixed(0)}k)</small>
          </span>
        `).join(' ');

        sizeRowsHtml += `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; border-radius: 6px; margin-bottom: 4px; ${borderStyle}">
            <span style="font-family: var(--font-mono); font-weight: 700; color: #fff; font-size: 0.75rem; min-width: 50px;">
              [${sizeLabel}]
            </span>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end;">
              ${chipsHtml}
            </div>
          </div>
        `;
      });

      altList.innerHTML = `
        <div style="width: 100%; margin-top: 0.5rem;">
          <div style="font-size: 0.72rem; font-weight: 700; color: var(--accent-cyan); margin-bottom: 0.35rem; display: flex; justify-content: space-between;">
            <span>🎯 IDENTIFICACIÓN EXACTA POR TAMAÑO DE CASILLA:</span>
            <span style="color: var(--text-muted); font-size: 0.68rem;">(Verifica qué tamaño tiene en tu pantalla)</span>
          </div>
          ${sizeRowsHtml}
        </div>
      `;

      // Permitir hacer clic en un candidato para ver su ficha
      altList.querySelectorAll('.radar-candidate-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          playSynthSFX('click');
          const iid = parseInt(chip.getAttribute('data-item-id'), 10);
          const chosen = allItems.find(it => it.id === iid);
          if (chosen) {
            if (itemImg) itemImg.src = chosen.iconUrl;
            if (itemName) itemName.textContent = `${chosen.nameEs} (${chosen.name})`;
            if (itemPrice) itemPrice.textContent = `Valor Estimado: ~${chosen.referencePrice.toLocaleString()} Koens • Tamaño: ${chosen.sizeLabel}`;
          }
        });
      });
    }

    // Agregar al Historial de la Sesión
    addRadarHistoryEntry(sound, representativeItem, confidence, detectedAction);
  }

  function addRadarHistoryEntry(sound, item, confidence, detectedAction = 'drop') {
    const tbody = document.getElementById('radar-history-tbody');
    if (!tbody) return;

    if (state.radar.history.length === 0) {
      tbody.innerHTML = '';
    }

    const timeStr = new Date().toLocaleTimeString();
    state.radar.history.unshift({ sound, item, confidence, timeStr });

    let badgeClass = 'skip';
    let badgeText = '⚪ Chatarra (0%)';
    if (sound.isGuaranteedRed) {
      badgeClass = 'red';
      badgeText = '🔥 100% Rojo';
    } else if (sound.hasRed) {
      badgeClass = 'gold';
      badgeText = `🟡 Rojo (${sound.redRatio}%)`;
    }

    let actionTag = '<small style="color: var(--text-muted);">(Drop)</small>';
    if (detectedAction === 'pickup') actionTag = '<small style="color: var(--accent-cyan);">(Pickup)</small>';
    else if (detectedAction === 'chain') actionTag = '<small style="color: var(--accent-gold);">(Doble Conf)</small>';

    const playFile = detectedAction === 'pickup' ? sound.pickup : sound.drop;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-dim);">${timeStr}</td>
      <td><span class="radar-history-badge ${badgeClass}">${badgeText}</span></td>
      <td><strong>#${sound.id}</strong> <small style="color: var(--text-muted);">${sound.name}</small> ${actionTag}</td>
      <td style="color: #fff;">${item.nameEs} <small style="color: var(--accent-gold);">(${item.referencePrice.toLocaleString()} K • ${item.sizeLabel})</small></td>
      <td style="font-family: var(--font-mono); color: var(--accent-cyan);">${confidence}%</td>
      <td>
        <button class="btn-mini-audio" data-file="${playFile}" data-name="Audio #${sound.id}">
          🔊 Escuchar
        </button>
      </td>
    `;

    const audioBtn = row.querySelector('.btn-mini-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        playSynthSFX('click');
        playSoundFile(playFile, `Historial #${sound.id}`, sound.name);
      });
    }

    tbody.insertBefore(row, tbody.firstChild);
  }

  function simulateRadarDrop() {
    playSynthSFX('click');
    const presets = [
      { soundId: 10, conf: 98, action: 'drop' },   // Módulo posición obj. / Antena / Módulo TI (#10)
      { soundId: 18, conf: 97, action: 'drop' },   // EMS (Espejo Matriz Sincronizada #18)
      { soundId: 14, conf: 98, action: 'drop' },   // Laúd doble c. (#14)
      { soundId: 25, conf: 96, action: 'drop' },   // Flauta esm. (#25)
      { soundId: 32, conf: 99, action: 'drop' },   // Tetera Antigua (100% Rojo - Drop)
      { soundId: 30, conf: 97, action: 'drop' },   // Jarrón de Porcelana (Rojo 92% - Drop)
      { soundId: 28, conf: 96, action: 'pickup' }, // Estatua León Dorado (Pickup)
      { soundId: 35, conf: 99, action: 'pickup' }, // Documento Secreto (16M+)
      { soundId: 10, conf: 96, action: 'pickup' }, // Módulo posición obj. (Pickup)
      { soundId: 2,  conf: 94, action: 'drop' }    // Madera / Común (0% Rojo)
    ];

    const pick = presets[state.radar.simIndex % presets.length];
    state.radar.simIndex++;

    const sound = ABI_DATA.sounds.find(s => s.id === pick.soundId) || ABI_DATA.sounds[0];
    const playFile = pick.action === 'pickup' ? sound.pickup : sound.drop;

    // Reproducir el sonido físico real para que el usuario lo escuche
    playSoundFile(playFile, `Movimiento Simulado #${sound.id}`, sound.name);

    // Desplegar veredicto
    displayRadarVerdict(sound, pick.conf, [], pick.action);
  }

  function clearRadarHistory() {
    state.radar.history = [];
    const tbody = document.getElementById('radar-history-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">
            Registro limpio. Esperando nuevas detecciones en raid.
          </td>
        </tr>
      `;
    }
  }

  // ==========================================================================
  // INICIALIZACIÓN DE EVENTOS Y CONTROLADORES
  // ==========================================================================
  function initEventListeners() {
    // 1. Cambio de Pestañas
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        playSynthSFX('click');
        const target = tab.getAttribute('data-tab');
        switchTab(target);
      });
    });

    const brandBtn = document.getElementById('brand-home-btn');
    if (brandBtn) {
      brandBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('trainer');
      });
    }

    // 2. Control de Volumen
    const volSlider = document.getElementById('master-volume');
    const volLabel = document.getElementById('volume-val');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        state.masterVolume = parseFloat(e.target.value);
        if (volLabel) volLabel.textContent = `${Math.round(state.masterVolume * 100)}%`;
        if (state.currentAudio) state.currentAudio.volume = state.masterVolume;
      });
    }

    // 3. Toggle de Sonidos SFX
    const sfxBtn = document.getElementById('btn-toggle-sfx');
    if (sfxBtn) {
      sfxBtn.addEventListener('click', () => {
        state.sfxEnabled = !state.sfxEnabled;
        sfxBtn.classList.toggle('active', state.sfxEnabled);
        if (state.sfxEnabled) playSynthSFX('click');
      });
    }

    // 4. Entrenador: Botones de Audio
    const btnPlayDrop = document.getElementById('btn-play-drop');
    const btnPlayPickup = document.getElementById('btn-play-pickup');
    const btnPlayCycle = document.getElementById('btn-play-cycle');
    const mysteryBox = document.getElementById('mystery-box');

    if (btnPlayDrop) {
      btnPlayDrop.addEventListener('click', () => {
        if (!state.trainer.currentMystery) return;
        playSoundFile(state.trainer.currentMystery.dropSound, 'Caja Misteriosa', 'Sonido DROP (Soltar)');
      });
    }
    if (btnPlayPickup) {
      btnPlayPickup.addEventListener('click', () => {
        if (!state.trainer.currentMystery) return;
        playSoundFile(state.trainer.currentMystery.pickupSound, 'Caja Misteriosa', 'Sonido PICKUP (Arrastrar)');
      });
    }
    if (btnPlayCycle) {
      btnPlayCycle.addEventListener('click', () => {
        if (!state.trainer.currentMystery) return;
        playAudioCycle(state.trainer.currentMystery.pickupSound, state.trainer.currentMystery.dropSound, 'Caja Misteriosa');
      });
    }
    if (mysteryBox) {
      mysteryBox.addEventListener('click', () => {
        if (!state.trainer.currentMystery) return;
        playSoundFile(state.trainer.currentMystery.dropSound, 'Caja Misteriosa', 'Sonido DROP');
      });
    }

    // 5. Entrenador: Botones de Decisión
    const btnChooseRed = document.getElementById('btn-choose-red');
    const btnChooseSkip = document.getElementById('btn-choose-skip');
    const btnNextRound = document.getElementById('btn-next-round');

    if (btnChooseRed) {
      btnChooseRed.addEventListener('click', () => handleTrainerDecision(true));
    }
    if (btnChooseSkip) {
      btnChooseSkip.addEventListener('click', () => handleTrainerDecision(false));
    }
    if (btnNextRound) {
      btnNextRound.addEventListener('click', () => {
        playSynthSFX('click');
        state.trainer.round++;
        generateNewMysteryRound();
      });
    }

    // 6. Entrenador: Filtros de Dificultad
    const selectTier = document.getElementById('select-pool-tier');
    const selectSize = document.getElementById('select-size-filter');
    const btnResetStats = document.getElementById('btn-reset-stats');

    if (selectTier) {
      selectTier.addEventListener('change', (e) => {
        state.trainer.tierFilter = e.target.value;
        const diffTag = document.getElementById('trainer-diff-tag');
        if (diffTag) diffTag.textContent = e.target.options[e.target.selectedIndex].text;
        generateNewMysteryRound();
      });
    }
    if (selectSize) {
      selectSize.addEventListener('change', (e) => {
        state.trainer.sizeFilter = e.target.value;
        generateNewMysteryRound();
      });
    }
    if (btnResetStats) {
      btnResetStats.addEventListener('click', () => {
        if (confirm('¿Deseas reiniciar todas tus estadísticas de racha y Koens?')) {
          state.trainer.streak = 0;
          state.trainer.bestStreak = 0;
          state.trainer.correctCount = 0;
          state.trainer.totalCount = 0;
          state.trainer.virtualKoens = 0;
          saveStats();
          updateStatsDisplay();
        }
      });
    }

    // 7. Asistente: Filtros de Tamaño y Precio
    const sizePillsGroup = document.getElementById('assistant-size-pills');
    if (sizePillsGroup) {
      sizePillsGroup.querySelectorAll('.size-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          playSynthSFX('click');
          sizePillsGroup.querySelectorAll('.size-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          state.assistant.selectedSize = pill.getAttribute('data-size');
          renderAssistantCards();
        });
      });
    }

    const priceSelect = document.getElementById('assistant-price-select');
    if (priceSelect) {
      priceSelect.addEventListener('change', (e) => {
        state.assistant.selectedPrice = e.target.value;
        renderAssistantCards();
      });
    }

    const catSelect = document.getElementById('assistant-cat-select');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        state.assistant.selectedCategory = e.target.value;
        renderAssistantCards();
      });
    }

    const redsOnlyCheck = document.getElementById('assistant-only-reds-check');
    if (redsOnlyCheck) {
      redsOnlyCheck.addEventListener('change', (e) => {
        state.assistant.onlyReds = e.target.checked;
        renderAssistantCards();
      });
    }

    // 8. Enciclopedia: Búsqueda y Filtros de Categoría
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

    // 9. Comparador: Preset Select
    const presetSelect = document.getElementById('compare-preset-select');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        updateComparePreset(e.target.value);
      });
    }

    // 10. Controles del Radar Acústico en Vivo
    const btnToggleRadar = document.getElementById('btn-toggle-radar');
    if (btnToggleRadar) {
      btnToggleRadar.addEventListener('click', toggleRadarCapture);
    }

    const selectRadarSource = document.getElementById('radar-source-mode');
    if (selectRadarSource) {
      selectRadarSource.addEventListener('change', (e) => {
        state.radar.sourceMode = e.target.value;
        if (state.radar.active) {
          toggleRadarCapture(); // Reiniciar con la nueva fuente
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

    // Selector de Modo de Visión Multimodal
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

    // Botón de HUD Flotante (Picture-in-Picture Always-on-Top)
    const btnTogglePiP = document.getElementById('btn-toggle-pip');
    if (btnTogglePiP) {
      btnTogglePiP.addEventListener('click', toggleRadarPiP);
    }

    // 11. Atajos de Teclado Tácticos
    window.addEventListener('keydown', (e) => {
      // Si el usuario presiona espacio en el trainer -> reproducir drop
      if (e.code === 'Space' && state.currentTab === 'trainer' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        if (state.trainer.currentMystery) {
          playSoundFile(state.trainer.currentMystery.dropSound, 'Caja Misteriosa', 'Sonido DROP');
        }
      }
      // Flecha izquierda -> Pasar, Flecha derecha -> Es Rojo
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

  // Cambio de Pestaña Activa
  function switchTab(tabId) {
    state.currentTab = tabId;

    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });

    // Renderizado según pestaña activa
    if (tabId === 'radar') {
      preloadRadarTemplates();
      startRadarScope();
    } else if (tabId === 'assistant') {
      renderAssistantCards();
    } else if (tabId === 'encyclopedia') {
      renderEncyclopedia();
    } else if (tabId === 'compare') {
      updateComparePreset('lion_vs_cheetah');
    } else if (tabId === 'guide') {
      renderCheatSheet();
    }
  }

  // Inicializar toda la aplicación
  function initApp() {
    loadSavedStats();
    initEventListeners();
    updateStatsDisplay();
    generateNewMysteryRound();
    renderAssistantCards();
    renderEncyclopedia();
    updateComparePreset('lion_vs_cheetah');
    renderCheatSheet();
    preloadRadarTemplates();
    startRadarScope();
    console.log('ABI Sound Master inicializado correctamente con', ABI_DATA.items.length, 'ítems y', ABI_DATA.sounds.length, 'sonidos.');
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
