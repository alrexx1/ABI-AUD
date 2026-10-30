/**
 * ABI SOUND MASTER - EXTRACCIÓN DE HUELLA ACÚSTICA MULTI-FASE
 * Calcula 3 ventanas temporales (Ataque, Resonancia, Cola) y la envolvente de 16 puntos.
 */

import { RADAR_FREQS } from '../core/constants.js';
import { computeWindowEnergyVector } from './goertzel.js';

/**
 * Extrae la huella espectro-temporal completa a partir de un buffer PCM
 * @param {Float32Array} samples - Muestras PCM (48kHz recomendado)
 * @param {number} sampleRate - Tasa de muestreo
 * @param {Float32Array|null} noiseSpectrum - Espectro de ruido ambiental
 * @returns {object} Huella acústica completa
 */
export function extractAcousticFeatures(samples, sampleRate, noiseSpectrum = null) {
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

  // 5. Medición de Tasa de Decaimiento Logarítmico (T60 en milisegundos):
  // Evalúa el tiempo que tardaría la resonancia acústica en disipar 60 dB de energía
  let t60 = 80.0; // Valor base por defecto
  const tStep = 512;
  const tVals = [];
  const dbVals = [];
  let maxStepRms = 0;

  const rmsSteps = [];
  for (let i = 0; i < 16; i++) {
    const sStart = peakIdx + (i * tStep);
    if (sStart + tStep > samples.length) break;
    let sSumSq = 0;
    for (let j = sStart; j < sStart + tStep; j++) {
      sSumSq += samples[j] * samples[j];
    }
    const stepRms = Math.sqrt(sSumSq / tStep);
    rmsSteps.push(stepRms);
    if (stepRms > maxStepRms) maxStepRms = stepRms;
  }

  if (maxStepRms > 1e-6 && rmsSteps.length >= 4) {
    for (let i = 0; i < rmsSteps.length; i++) {
      const dbRel = 20 * Math.log10(Math.max(1e-6, rmsSteps[i] / maxStepRms));
      const tMs = i * (tStep / sampleRate) * 1000;
      if (dbRel <= -3 && dbRel >= -35) {
        dbVals.push(dbRel);
        tVals.push(tMs);
      }
    }

    if (tVals.length >= 3) {
      const N = tVals.length;
      let sumT = 0, sumY = 0, sumTY = 0, sumT2 = 0;
      for (let i = 0; i < N; i++) {
        sumT += tVals[i];
        sumY += dbVals[i];
        sumTY += tVals[i] * dbVals[i];
        sumT2 += tVals[i] * tVals[i];
      }
      const denom = (N * sumT2 - sumT * sumT);
      if (Math.abs(denom) > 1e-6) {
        const slope = (N * sumTY - sumT * sumY) / denom; // dB / ms
        if (slope < -0.05) {
          t60 = Math.min(850.0, Math.max(30.0, -60.0 / slope));
        }
      }
    }
  }

  // 6. Factor Q de Resonancia (Agudeza del Pico Armónico):
  // Mide qué tan estrecha y pura es la vibración frente a la energía de bandas vecinas
  let surrSum = 0;
  let surrCount = 0;
  for (const offset of [-2, -1, 1, 2]) {
    const surrIdx = maxBandIdx + offset;
    if (surrIdx >= 0 && surrIdx < slice2.length) {
      surrSum += slice2[surrIdx];
      surrCount++;
    }
  }
  const surrMean = surrCount > 0 ? (surrSum / surrCount) : 1e-6;
  const qFactor = Math.min(25.0, Math.max(1.0, maxBandVal / Math.max(1e-6, surrMean)));

  return {
    slice1,
    slice2,
    slice3,
    vector: slice2,
    env16,
    centroid: weightedFreq,
    highRatio: (highFreqSum + 0.001) / (lowFreqSum + 0.001),
    spectralFlatness,
    dominantFreq: RADAR_FREQS[maxBandIdx],
    t60: Math.round(t60),
    qFactor: Math.round(qFactor * 10) / 10
  };
}

