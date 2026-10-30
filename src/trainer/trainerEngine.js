/**
 * ABI SOUND MASTER - ENTRENADOR DE OÍDO (TRAINER / QUIZ ENGINE)
 * Generación de cajas misteriosas, toma de decisiones, cálculo de Koens y rangos tácticos.
 */

import { state, saveStats } from '../core/state.js';
import { playSoundFile, playSynthSFX } from '../audio/audioEngine.js';

export function generateNewMysteryRound() {
  const items = window.ABI_DATA ? window.ABI_DATA.items : [];
  const sounds = window.ABI_DATA ? window.ABI_DATA.sounds : [];
  if (!items.length || !sounds.length) return;

  let candidateItems = [];

  if (state.trainer.tierFilter === 'red_only_pool') {
    const redSoundIds = new Set(sounds.filter(s => s.hasRed).map(s => s.id));
    candidateItems = items.filter(it => redSoundIds.has(it.soundId));
  } else if (state.trainer.tierFilter === 'traps') {
    const trapSoundIds = new Set(sounds.filter(s => s.hasRed && !s.isGuaranteedRed).map(s => s.id));
    candidateItems = items.filter(it => trapSoundIds.has(it.soundId));
  } else if (state.trainer.tierFilter === 'high') {
    candidateItems = items.filter(it => it.referencePrice >= 100000 || it.rarity >= 5);
  } else {
    candidateItems = items;
  }

  if (state.trainer.sizeFilter !== 'all') {
    candidateItems = candidateItems.filter(it => it.sizeLabel === state.trainer.sizeFilter);
  }

  if (candidateItems.length === 0) {
    candidateItems = items;
  }

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

  const soundData = sounds.find(s => s.id === chosenItem.soundId) || sounds[0];

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

export function renderTrainerStage() {
  const mystery = state.trainer.currentMystery;
  if (!mystery) return;

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

  if (mysteryBox) mysteryBox.className = 'mystery-box-container';
  if (boxHalo) boxHalo.className = 'mystery-box-halo';
  if (revealedImg) revealedImg.src = '';

  if (decisionPanel) decisionPanel.style.display = 'grid';
  if (feedbackBox) {
    feedbackBox.style.display = 'none';
    feedbackBox.className = 'feedback-box';
  }

  playSoundFile(mystery.dropSound, `Caja Misteriosa (${mystery.item.sizeLabel})`, 'Escuchando sonido de Drop...');
}

export function handleTrainerDecision(userChoseRed) {
  if (state.trainer.isRevealed) return;
  state.trainer.isRevealed = true;

  const mystery = state.trainer.currentMystery;
  const isActualRed = mystery.item.isRed;
  const isCorrect = (userChoseRed === isActualRed);

  state.trainer.totalCount++;

  let profitDelta = 0;
  if (userChoseRed) {
    if (isActualRed) {
      profitDelta = mystery.item.referencePrice - mystery.boxPrice;
      state.trainer.virtualKoens += profitDelta;
      state.trainer.streak++;
      state.trainer.correctCount++;
      playSynthSFX('success');
    } else {
      profitDelta = mystery.item.referencePrice - mystery.boxPrice;
      state.trainer.virtualKoens += profitDelta;
      state.trainer.streak = 0;
      playSynthSFX('fail');
    }
  } else {
    if (!isActualRed) {
      profitDelta = 0;
      state.trainer.streak++;
      state.trainer.correctCount++;
      playSynthSFX('success');
    } else {
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

export function updateStatsDisplay() {
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

  let rank = 'Recluta de Campo';
  if (t.correctCount >= 25) rank = 'Maestro de la Zona Oscura 🏆';
  else if (t.correctCount >= 15) rank = 'Comerciante Veterano 💎';
  else if (t.correctCount >= 8) rank = 'Cazador de Rojos 🎯';
  else if (t.correctCount >= 3) rank = 'Oído Táctico 🎧';

  if (rankTitleEl) rankTitleEl.textContent = rank;
  if (rankSubEl) rankSubEl.textContent = `${t.correctCount} aciertos de ${t.totalCount} rondas`;
}

