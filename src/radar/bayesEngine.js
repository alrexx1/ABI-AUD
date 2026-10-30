/**
 * ABI SOUND MASTER - MOTOR DE FUSIÓN BAYESIANA MULTIMODAL
 * Inferencia probabilística exacta combinando física acústica (T60, Factor Q),
 * conteo visual de cuadrícula (HSV) y economía de cajas del comerciante.
 */

import { scoreTemplateSimilarity } from '../dsp/similarity.js';

/**
 * Calcula la distribución posterior de probabilidad para todos los ítems candidatos
 * @param {object} liveFeat - Huella física del audio en vivo (espectro, T60, Factor Q)
 * @param {Array} templates - Plantillas acústicas cargadas
 * @param {string} detectedSize - Tamaño detectado por visión ('2x2', '2x3', etc.)
 * @param {number} gridConfidence - Confianza visual (0.0 a 1.0)
 * @param {number|null} boxPrice - Precio simulado o detectado de la caja
 * @returns {object} Veredicto bayesiano completo con probabilidades porcentuales
 */
export function computeBayesianVerdict(liveFeat, templates, detectedSize = 'all', gridConfidence = 0.70, boxPrice = null) {
  const allItems = (typeof window !== 'undefined' && window.ABI_DATA) ? window.ABI_DATA.items : [];
  if (!templates || templates.length === 0 || allItems.length === 0) {
    return null;
  }

  // 1. Evaluar verosimilitud acústica para cada plantilla
  const soundAcousticScores = new Map();

  for (const tmpl of templates) {
    const rawSim = scoreTemplateSimilarity(liveFeat, tmpl);
    const existing = soundAcousticScores.get(tmpl.sound.id);
    if (!existing || rawSim > existing.score) {
      soundAcousticScores.set(tmpl.sound.id, {
        sound: tmpl.sound,
        action: tmpl.action,
        score: rawSim,
        template: tmpl
      });
    }
  }

  // 2. Fusión Probabilística por Ítem Individual
  const itemPosteriors = [];

  for (const [soundId, match] of soundAcousticScores.entries()) {
    const s = match.score;
    // Verosimilitud acústica Gaussiana afilada (sigma = 0.12) para alta discriminación
    const acousticLikelihood = Math.exp(-Math.pow(1.0 - s, 2) / (2 * 0.12 * 0.12));

    // Todos los ítems asociados a este perfil de sonido
    const soundItemRefs = match.sound.items || [];
    for (const ref of soundItemRefs) {
      const fullItem = allItems.find(it => it.id === ref.id);
      if (!fullItem) continue;

      // A) Verosimilitud Geométrica (Tamaño de Casilla de Inventario)
      let geoLikelihood = 1.0;
      if (detectedSize !== 'all') {
        if (fullItem.sizeLabel === detectedSize) {
          geoLikelihood = 1.0;
        } else {
          // Penalización proporcional a la certeza del conteo visual
          geoLikelihood = Math.max(0.01, 1.0 - gridConfidence);
        }
      }

      // B) Verosimilitud Económica (Precio de la Caja en el Vendedor de Campo)
      let econLikelihood = 1.0;
      if (boxPrice && boxPrice > 0) {
        if (boxPrice >= 500000) {
          // Cajas de 550K: Primordialmente ítems de 2x3 o ultra-valiosos
          econLikelihood = (fullItem.sizeLabel === '2x3' || fullItem.referencePrice >= 1400000) ? 1.0 : 0.08;
        } else if (boxPrice >= 400000) {
          // Cajas de 470K: Ítems dorados y rojos de 2x2
          econLikelihood = (fullItem.sizeLabel === '2x2') ? 1.0 : 0.15;
        } else if (boxPrice >= 200000) {
          // Cajas de 250K: Ítems pequeños de 1x2, 2x1 o 1x1
          econLikelihood = (fullItem.sizeLabel === '1x2' || fullItem.sizeLabel === '2x1' || fullItem.sizeLabel === '1x1') ? 1.0 : 0.10;
        }
      }

      // C) Probabilidad a Priori por Rareza
      const prior = fullItem.isRed ? 0.30 : fullItem.isGold ? 0.40 : 0.30;

      // Ponderación conjunta
      const unnormalizedWeight = acousticLikelihood * geoLikelihood * econLikelihood * prior;

      itemPosteriors.push({
        item: fullItem,
        sound: match.sound,
        action: match.action,
        rawAcousticSim: s,
        geoLikelihood,
        econLikelihood,
        weight: unnormalizedWeight
      });
    }
  }

  // 3. Normalizar distribución bayesiana a suma 1.0 (100%)
  const totalWeight = itemPosteriors.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return null;

  for (const entry of itemPosteriors) {
    entry.posterior = entry.weight / totalWeight;
  }

  // Ordenar de mayor a menor probabilidad posterior
  itemPosteriors.sort((a, b) => b.posterior - a.posterior);

  // 4. Agregar probabilidades acumuladas por clase
  let pRed = 0;
  let pGold = 0;
  let pJunk = 0;

  for (const entry of itemPosteriors) {
    if (entry.item.isRed) pRed += entry.posterior;
    else if (entry.item.isGold) pGold += entry.posterior;
    else pJunk += entry.posterior;
  }

  const topMatch = itemPosteriors[0];
  const candidates = itemPosteriors.slice(0, 5);

  return {
    topItem: topMatch.item,
    topSound: topMatch.sound,
    topAction: topMatch.action,
    confidence: Math.round(topMatch.posterior * 100),
    acousticScore: Math.round(topMatch.rawAcousticSim * 100),
    pRed: Math.round(pRed * 100),
    pGold: Math.round(pGold * 100),
    pJunk: Math.round(pJunk * 100),
    isGuaranteedRed: pRed >= 95 || topMatch.sound.isGuaranteedRed,
    hasRedPotential: pRed >= 20,
    candidates,
    t60Measured: liveFeat.t60 || 0,
    qFactorMeasured: liveFeat.qFactor || 0,
    gridDetected: detectedSize,
    gridConfidence: Math.round(gridConfidence * 100)
  };
}
