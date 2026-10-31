/**
 * ABI SOUND MASTER - MOTOR DE FUSIÓN BAYESIANA JERÁRQUICA MULTIMODAL
 * Inferencia probabilística jerárquica en dos niveles:
 * Nivel 1: Verosimilitud acústica por perfil de sonido físico (Softmax / Boltzmann).
 * Nivel 2: Desambiguación condicionada de ítems (Geometría de casillas, Rareza y Economía).
 * Elimina matemáticamente la dilución por acumulación de chatarra en perfiles no ganadores.
 */

import { scoreTemplateSimilarity } from '../dsp/similarity.js';

/**
 * Calcula la distribución posterior de probabilidad para todos los ítems candidatos
 * @param {object} liveFeat - Huella física del audio en vivo (espectro, T60, Factor Q)
 * @param {Array} templates - Plantillas acústicas cargadas
 * @param {string} detectedSize - Tamaño detectado por visión o asistente ('all', '2x2', '3x2', etc.)
 * @param {number} gridConfidence - Confianza visual o de selección (0.0 a 1.0)
 * @param {number|null} boxPrice - Precio simulado o detectado de la caja
 * @param {string} detectedOrientation - Orientación física ('any', 'horizontal', 'vertical', 'square')
 * @returns {object} Veredicto bayesiano completo con probabilidades porcentuales
 */
export function computeBayesianVerdict(
  liveFeat,
  templates,
  detectedSize = 'all',
  gridConfidence = 0.70,
  boxPrice = null,
  detectedOrientation = 'any'
) {
  const allItems = (typeof window !== 'undefined' && window.ABI_DATA) ? window.ABI_DATA.items : [];
  if (!templates || templates.length === 0 || allItems.length === 0) {
    return null;
  }

  // =========================================================================
  // NIVEL 1: VEROSIMILITUD ACÚSTICA POR PERFIL DE SONIDO FÍSICO P(A | S_k)
  // Cada impacto en el juego es producido por un único perfil acústico.
  // =========================================================================
  const soundScores = new Map();

  for (const tmpl of templates) {
    const rawSim = scoreTemplateSimilarity(liveFeat, tmpl);
    const sid = tmpl.sound.id;
    const existing = soundScores.get(sid);
    if (!existing || rawSim > existing.score) {
      soundScores.set(sid, {
        sound: tmpl.sound,
        action: tmpl.action,
        score: rawSim,
        template: tmpl
      });
    }
  }

  if (soundScores.size === 0) return null;

  // Encontrar el puntaje acústico máximo global para centrar la distribución Boltzmann
  let topScore = -Infinity;
  for (const match of soundScores.values()) {
    if (match.score > topScore) topScore = match.score;
  }

  // Temperatura adaptativa: cuando la concordancia es cristalina (>0.85), se usa
  // una temperatura estrecha (tau = 0.022) que confina >85-95% de la probabilidad en el
  // perfil acústico real, previniendo que decenas de ítems de chatarra diluyan el veredicto.
  const tau = topScore >= 0.85 ? 0.022 : (topScore >= 0.70 ? 0.030 : 0.045);

  let sumSoundLikelihood = 0;
  const soundProbs = new Map();
  for (const [sid, match] of soundScores.entries()) {
    const likelihood = Math.exp((match.score - topScore) / tau);
    soundProbs.set(sid, { ...match, likelihood });
    sumSoundLikelihood += likelihood;
  }

  // Normalizar la probabilidad a posteriori de cada perfil acústico P(S_k | A)
  for (const match of soundProbs.values()) {
    match.prob = sumSoundLikelihood > 0 ? (match.likelihood / sumSoundLikelihood) : 0;
  }

  // =========================================================================
  // NIVEL 2: DESAMBIGUACIÓN CONDICIONADA DE ÍTEMS DENTRO DE CADA SONIDO
  // P(Item_i | S_k, Geo, Econ) * P(S_k | A)
  // =========================================================================
  const itemPosteriors = [];

  for (const soundMatch of soundProbs.values()) {
    const pSound = soundMatch.prob;
    // Poda defensiva de perfiles acústicamente descartados (<0.01% de probabilidad)
    if (pSound < 1e-4) continue;

    const soundItemRefs = soundMatch.sound.items || [];
    if (soundItemRefs.length === 0) continue;

    const itemWeights = [];
    let sumItemWeight = 0;

    for (const ref of soundItemRefs) {
      const fullItem = allItems.find(it => it.id === ref.id);
      if (!fullItem) continue;

      // A) Verosimilitud Geométrica y Orientación Física (Tamaño y Forma de Casilla)
      let geoLikelihood = 1.0;
      const sz = fullItem.sizeLabel || '';
      const [iCols, iRows] = fullItem.size || [1, 1];
      const itemOrientation = (iCols > iRows) ? 'horizontal' : (iRows > iCols ? 'vertical' : 'square');

      if (detectedSize !== 'all') {
        if (sz === detectedSize) {
          // Coincidencia exacta de tamaño
          if (detectedOrientation !== 'any' && detectedOrientation !== itemOrientation) {
            geoLikelihood = 0.80; // Misma celda pero orientación ligeramente discordante
          } else {
            geoLikelihood = 1.0;
          }
        } else {
          const szRev = sz.split('x').reverse().join('x');
          if (szRev === detectedSize) {
            // Misma dimensión pero rotado (ej. 3x2 vs 2x3)
            if (detectedOrientation !== 'any') {
              geoLikelihood = (detectedOrientation === itemOrientation) ? 0.95 : 0.05;
            } else {
              geoLikelihood = 0.55;
            }
          } else {
            // Penalización severa basada en certeza visual o de selección
            geoLikelihood = Math.max(0.002, 1.0 - gridConfidence);
          }
        }
      } else if (detectedOrientation !== 'any') {
        // Tamaño 'all', pero orientación detectada (Horizontal, Vertical o Cuadrada)
        if (itemOrientation === detectedOrientation) {
          geoLikelihood = 1.0;
        } else if (itemOrientation === 'square') {
          geoLikelihood = 0.30;
        } else {
          // Orientación opuesta (ej. detectado Horizontal pero ítem es Vertical)
          geoLikelihood = 0.04;
        }
      }

      // B) Verosimilitud Económica (Precio de la Caja en el Vendedor de Campo)
      let econLikelihood = 1.0;
      if (boxPrice && boxPrice > 0) {
        if (boxPrice >= 500000) {
          // Cajas de 550K: Primordialmente ítems de 2x3 o ultra-valiosos
          econLikelihood = (fullItem.sizeLabel === '2x3' || fullItem.sizeLabel === '3x2' || fullItem.referencePrice >= 1400000) ? 1.0 : 0.05;
        } else if (boxPrice >= 400000) {
          // Cajas de 470K: Ítems dorados y rojos de 2x2
          econLikelihood = (fullItem.sizeLabel === '2x2') ? 1.0 : 0.10;
        } else if (boxPrice >= 200000) {
          // Cajas de 250K: Ítems pequeños de 1x2, 2x1 o 1x1
          econLikelihood = (fullItem.sizeLabel === '1x2' || fullItem.sizeLabel === '2x1' || fullItem.sizeLabel === '1x1') ? 1.0 : 0.10;
        }
      }

      // C) Prior de Rareza Táctica en Raid
      const prior = fullItem.isRed ? 1.8 : (fullItem.isGold ? 1.0 : 0.4);

      const unnormalizedWeight = geoLikelihood * econLikelihood * prior;
      sumItemWeight += unnormalizedWeight;
      itemWeights.push({
        item: fullItem,
        geoLikelihood,
        econLikelihood,
        weight: unnormalizedWeight
      });
    }

    if (sumItemWeight <= 0) continue;

    // Distribuir la masa de probabilidad del sonido entre sus ítems miembros
    for (const entry of itemWeights) {
      const pItemGivenSound = entry.weight / sumItemWeight;
      const jointPosterior = pSound * pItemGivenSound;

      itemPosteriors.push({
        item: entry.item,
        sound: soundMatch.sound,
        action: soundMatch.action,
        rawAcousticSim: soundMatch.score,
        geoLikelihood: entry.geoLikelihood,
        econLikelihood: entry.econLikelihood,
        posterior: jointPosterior
      });
    }
  }

  if (itemPosteriors.length === 0) return null;

  // Ordenar de mayor a menor probabilidad posterior
  itemPosteriors.sort((a, b) => b.posterior - a.posterior);

  // Agregar probabilidades acumuladas por clase
  let pRed = 0;
  let pGold = 0;
  let pJunk = 0;

  for (const entry of itemPosteriors) {
    if (entry.item.isRed) pRed += entry.posterior;
    else if (entry.item.isGold) pGold += entry.posterior;
    else pJunk += entry.posterior;
  }

  const topMatch = itemPosteriors[0];
  const candidates = itemPosteriors.slice(0, 6);

  // Si el perfil acústico ganador es 100% garantizado rojo (ej. Tetera de Porcelana #32)
  // y la similitud acústica es sólida, asegurar que la certeza roja sea total
  const isGuaranteedSound = Boolean(topMatch.sound && topMatch.sound.isGuaranteedRed);
  if (isGuaranteedSound && topMatch.rawAcousticSim >= 0.70) {
    pRed = Math.max(pRed, 0.98);
    pGold = Math.min(pGold, 0.01);
    pJunk = Math.min(pJunk, 0.01);
  }

  const pRedPct = Math.round(pRed * 100);
  const pGoldPct = Math.round(pGold * 100);
  const pJunkPct = Math.round(pJunk * 100);

  return {
    topItem: topMatch.item,
    topSound: topMatch.sound,
    topAction: topMatch.action,
    confidence: Math.round(topMatch.posterior * 100),
    acousticScore: Math.round(topMatch.rawAcousticSim * 100),
    pRed: pRedPct,
    pGold: pGoldPct,
    pJunk: pJunkPct,
    isGuaranteedRed: pRedPct >= 90 || isGuaranteedSound,
    hasRedPotential: pRedPct >= 20,
    candidates,
    t60Measured: liveFeat.t60 || 0,
    qFactorMeasured: liveFeat.qFactor || 0,
    gridDetected: detectedSize,
    orientationDetected: detectedOrientation,
    gridConfidence: Math.round(gridConfidence * 100)
  };
}
