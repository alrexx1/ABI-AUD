/**
 * SUITE DE PRUEBAS UNITARIAS: ALGORITMOS DSP
 * Verificación matemática de Goertzel, similitud de coseno y correlación de Pearson.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Importar funciones DSP compiladas en CJS o evaluar directamente
function goertzelEnergy(samples, targetFreq, sampleRate) {
  const N = samples.length;
  if (N === 0) return 0;
  const k = Math.round((N * targetFreq) / sampleRate);
  const omega = (2 * Math.PI * k) / N;
  const coeff = 2 * Math.cos(omega);
  let s0 = 0, s1 = 0, s2 = 0;
  for (let i = 0; i < N; i++) {
    s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2);
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

describe('Motor DSP: Filtros y Similitud', () => {

  it('debe detectar resonancia de frecuencia pura con el algoritmo Goertzel', () => {
    const sampleRate = 48000;
    const targetFreq = 4200; // Resonancia de Tetera Antigua
    const N = 2048;
    const samples = new Float32Array(N);

    // Generar tono puro a 4200 Hz
    for (let i = 0; i < N; i++) {
      samples[i] = Math.sin((2 * Math.PI * targetFreq * i) / sampleRate);
    }

    const energyTarget = goertzelEnergy(samples, targetFreq, sampleRate);
    const energyOff = goertzelEnergy(samples, 1000, sampleRate); // Frecuencia lejana

    assert.ok(energyTarget > 100000, 'La energía en la frecuencia objetivo debe ser masiva');
    assert.ok(energyTarget > energyOff * 100, 'La energía objetivo debe ser órdenes de magnitud mayor que la no coincidente');
  });

  it('debe calcular similitud de coseno perfecta (1.0) para vectores idénticos', () => {
    const v1 = new Float32Array([0.1, 0.5, 0.8, 0.2, 0.9]);
    const v2 = new Float32Array([0.1, 0.5, 0.8, 0.2, 0.9]);
    const sim = computeCosineSimilarity(v1, v2);
    assert.ok(Math.abs(sim - 1.0) < 1e-5, 'Vectores idénticos deben tener similitud 1.0');
  });

  it('debe calcular similitud de coseno 0 para vectores ortogonales', () => {
    const v1 = new Float32Array([1, 0, 0]);
    const v2 = new Float32Array([0, 1, 0]);
    const sim = computeCosineSimilarity(v1, v2);
    assert.strictEqual(sim, 0, 'Vectores ortogonales deben tener similitud 0');
  });

  it('debe calcular correlación de Pearson lineal perfecta (1.0)', () => {
    const arr1 = new Float32Array([1, 2, 3, 4, 5]);
    const arr2 = new Float32Array([2, 4, 6, 8, 10]);
    const corr = computePearsonCorrelation(arr1, arr2);
    assert.ok(Math.abs(corr - 1.0) < 1e-5, 'Series directamente proporcionales deben tener correlación 1.0');
  });

  it('debe manejar adecuadamente buffers vacíos o de longitud cero', () => {
    assert.strictEqual(goertzelEnergy(new Float32Array(0), 4200, 48000), 0);
    assert.strictEqual(computeCosineSimilarity(new Float32Array(0), new Float32Array(0)), 0);
    assert.strictEqual(computePearsonCorrelation(new Float32Array(0), new Float32Array(0)), 0);
  });

});

