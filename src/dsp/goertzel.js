/**
 * ABI SOUND MASTER - FILTROS GOERTZEL Y VENTANEO HANN
 * Algoritmos deterministas puros para calcular la energía en frecuencias específicas.
 */

import { RADAR_FREQS } from '../core/constants.js';

/**
 * Calcula la potencia cuadrática en una frecuencia objetivo usando el algoritmo Goertzel
 * @param {Float32Array|Array<number>} samples - Muestras PCM
 * @param {number} targetFreq - Frecuencia deseada en Hz
 * @param {number} sampleRate - Tasa de muestreo (ej. 48000 Hz)
 * @returns {number} Energía calculada
 */
export function goertzelEnergy(samples, targetFreq, sampleRate) {
  const N = samples.length;
  if (N === 0) return 0;

  const k = Math.round((N * targetFreq) / sampleRate);
  const omega = (2 * Math.PI * k) / N;
  const coeff = 2 * Math.cos(omega);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;

  for (let i = 0; i < N; i++) {
    s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2);
}

/**
 * Extrae el vector de energía en las 24 frecuencias con ventana Hann aplicada
 * @param {Float32Array|Array<number>} samples - Buffer PCM continuo
 * @param {number} offset - Índice de inicio
 * @param {number} length - Longitud de la ventana
 * @param {number} sampleRate - Tasa de muestreo
 * @param {Float32Array|null} noiseSpectrum - Espectro de ruido ambiental calibrado
 * @returns {Float32Array} Vector normalizado de 24 bandas
 */
export function computeWindowEnergyVector(samples, offset, length, sampleRate, noiseSpectrum = null) {
  const N = Math.min(length, samples.length - offset);
  if (N <= 0) return new Float32Array(RADAR_FREQS.length);

  const windowed = new Float32Array(N);
  const denom = N > 1 ? N - 1 : 1;
  for (let i = 0; i < N; i++) {
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / denom));
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

/**
 * Actualiza el perfil de ruido ambiental usando una media móvil exponencial (EMA)
 * @param {Float32Array} noiseFloor - Espectro acumulado de ruido
 * @param {Float32Array} currentSpectrum - Espectro actual en período silencioso
 * @param {number} alpha - Factor de aprendizaje (0.01 a 0.1)
 * @returns {Float32Array} Perfil de ruido actualizado
 */
export function updateNoiseFloorMovingAverage(noiseFloor, currentSpectrum, alpha = 0.05) {
  if (!noiseFloor || noiseFloor.length !== currentSpectrum.length) {
    return new Float32Array(currentSpectrum);
  }
  for (let i = 0; i < noiseFloor.length; i++) {
    noiseFloor[i] = (1 - alpha) * noiseFloor[i] + alpha * currentSpectrum[i];
  }
  return noiseFloor;
}

