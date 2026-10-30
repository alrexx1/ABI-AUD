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

  return {
    slice1,
    slice2,
    slice3,
    vector: slice2,
    env16,
    centroid: weightedFreq,
    highRatio: (highFreqSum + 0.001) / (lowFreqSum + 0.001),
    spectralFlatness,
    dominantFreq: RADAR_FREQS[maxBandIdx]
  };
}

