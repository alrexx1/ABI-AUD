/**
 * ABI SOUND MASTER - ALGORITMOS DE SIMILITUD VECTORIAL
 * Coseno multidimensional, correlación de Pearson y ponderación armónica.
 */

/**
 * Calcula la similitud de coseno entre dos vectores numéricos
 * @param {Float32Array|Array<number>} v1
 * @param {Float32Array|Array<number>} v2
 * @returns {number} Valor entre 0 y 1
 */
export function computeCosineSimilarity(v1, v2) {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;
  let dot = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    mag1 += v1[i] * v1[i];
    mag2 += v2[i] * v2[i];
  }

  const denom = Math.sqrt(mag1) * Math.sqrt(mag2);
  return denom > 0 ? (dot / denom) : 0;
}

/**
 * Calcula el coeficiente de correlación de Pearson entre dos series
 * @param {Float32Array|Array<number>} arr1
 * @param {Float32Array|Array<number>} arr2
 * @returns {number} Valor entre 0 y 1 (o negativo si hay correlación inversa)
 */
export function computePearsonCorrelation(arr1, arr2) {
  if (!arr1 || !arr2 || arr1.length !== arr2.length || arr1.length === 0) return 0;
  const n = arr1.length;
  let sum1 = 0;
  let sum2 = 0;

  for (let i = 0; i < n; i++) {
    sum1 += arr1[i];
    sum2 += arr2[i];
  }
  const mean1 = sum1 / n;
  const mean2 = sum2 / n;
  let num = 0;
  let den1 = 0;
  let den2 = 0;

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

/**
 * Puntuación acústica global ponderada entre huella en vivo y plantilla oficial
 * @param {object} liveFeat - Huella extraída del audio en vivo
 * @param {object} tmplFeat - Plantilla calibrada de referencia
 * @returns {number} Puntuación de similitud entre 0.0 y 0.99
 */
export function scoreTemplateSimilarity(liveFeat, tmplFeat) {
  // 1. Similitud Multi-Slice Espectro-Temporal:
  const simSlice1 = computeCosineSimilarity(liveFeat.slice1, tmplFeat.slice1); // Ataque (0-35ms)
  const simSlice2 = computeCosineSimilarity(liveFeat.slice2, tmplFeat.slice2); // Resonancia Cuerpo (35-100ms)
  const simSlice3 = computeCosineSimilarity(liveFeat.slice3, tmplFeat.slice3); // Cola Decaimiento (100-200ms)

  // 2. Correlación de Envolvente Temporal de 16 Puntos (Decay Rate Envelope):
  const envCorr = computePearsonCorrelation(liveFeat.env16, tmplFeat.env16);

  // 3. Similitud de Centroide y Brillo Espectral:
  const centDiff = Math.abs(liveFeat.centroid - tmplFeat.centroid);
  const centSim = Math.max(0, 1 - (centDiff / 4200));

  // Ponderación de Precisión:
  // Cuerpo resonante (Slice 2) = 35% | Envolvente = 20% | Ataque = 15% | Cola = 15% | Centroide = 15%
  let score = (simSlice2 * 0.35) + (envCorr * 0.20) + (simSlice1 * 0.15) + (simSlice3 * 0.15) + (centSim * 0.15);

  // 4. Bonificación armónica por coincidencia de frecuencia dominante física
  if (liveFeat.dominantFreq === tmplFeat.dominantFreq) {
    score += 0.05;
  }

  // 5. Discriminación Física por Tasa de Decaimiento (T60) y Factor Q
  if (liveFeat.t60 && tmplFeat.t60) {
    const t60Ratio = Math.min(liveFeat.t60, tmplFeat.t60) / Math.max(liveFeat.t60, tmplFeat.t60, 1);
    // Ponderación continua suave: bonifica concordancia física y penaliza desajustes extremos sin cortes bruscos
    score += (t60Ratio - 0.5) * 0.08;
  }

  if (liveFeat.qFactor && tmplFeat.qFactor) {
    const qRatio = Math.min(liveFeat.qFactor, tmplFeat.qFactor) / Math.max(liveFeat.qFactor, tmplFeat.qFactor, 1);
    score += (qRatio - 0.5) * 0.04;
  }

  // Penalización por diferencia drástica de brillo armónico (highRatio)
  const hrDiff = Math.abs(Math.log10(Math.max(0.01, liveFeat.highRatio)) - Math.log10(Math.max(0.01, tmplFeat.highRatio)));
  if (hrDiff > 1.2) {
    score -= 0.06;
  }

  return Math.min(0.99, Math.max(0, score));
}

