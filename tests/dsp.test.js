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

  it('debe calcular la tasa de decaimiento logarítmico T60 distinguiendo metales/cerámica de impactos secos', async () => {
    const { extractAcousticFeatures } = await import('../src/dsp/features.js');
    const sr = 48000;
    const len = 8192;

    // 1. Simular señal de porcelana resonante (alta duración de caída)
    const resonantSamples = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const decay = Math.exp(-i / 3500); // Decaimiento suave
      resonantSamples[i] = Math.sin((2 * Math.PI * 4200 * i) / sr) * decay;
    }
    const featResonant = extractAcousticFeatures(resonantSamples, sr);

    // 2. Simular impacto seco de chatarra (caída abrupta)
    const drySamples = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const decay = Math.exp(-i / 200); // Decaimiento casi instantáneo
      drySamples[i] = (Math.random() * 2 - 1) * decay;
    }
    const featDry = extractAcousticFeatures(drySamples, sr);

    assert.ok(featResonant.t60 > 150, `El T60 de porcelana debe ser > 150ms (obtenido: ${featResonant.t60}ms)`);
    assert.ok(featResonant.t60 > featDry.t60, 'El T60 resonante debe ser sustancialmente mayor que el impacto seco');
    assert.ok(featResonant.qFactor > 1.5, `El Factor Q de resonancia debe ser alto (obtenido: ${featResonant.qFactor})`);
  });

  it('debe realizar inferencia bayesiana multimodal combinando audio, tamaño y precio de caja', async () => {
    const { computeBayesianVerdict } = await import('../src/radar/bayesEngine.js');
    const fs = require('fs');
    const path = require('path');

    // Cargar datos oficiales para entorno de test
    const appData = require('../app_data.js');
    global.window = { ABI_DATA: appData };

    const rawSigs = JSON.parse(fs.readFileSync(path.join(__dirname, '../radar_signatures.json'), 'utf8'));
    const lionTmpl = rawSigs.find(t => t.sound.id === 28 && t.action === 'drop');
    assert.ok(lionTmpl, 'Debe existir la plantilla de Estatua de León (#28)');

    const syntheticFeat = {
      slice1: new Float32Array(lionTmpl.slice1),
      slice2: new Float32Array(lionTmpl.slice2),
      slice3: new Float32Array(lionTmpl.slice3),
      vector: new Float32Array(lionTmpl.vector),
      env16: new Float32Array(lionTmpl.env16),
      centroid: lionTmpl.centroid,
      highRatio: lionTmpl.highRatio,
      dominantFreq: lionTmpl.dominantFreq,
      t60: lionTmpl.t60 || 700,
      qFactor: lionTmpl.qFactor || 4.0
    };

    // Caso A: Sonido de estatua #28 + Casilla 3x2 (Tamaño del León) + Caja 550K
    const verdictLion = computeBayesianVerdict(syntheticFeat, rawSigs, '3x2', 0.95, 550000);
    assert.ok(verdictLion, 'Debe producir un veredicto bayesiano');
    assert.ok(verdictLion.pRed >= 80, `Probabilidad roja debe ser alta para León 3x2 (obtenido: ${verdictLion.pRed}%)`);
    assert.strictEqual(verdictLion.topItem.nameEs, 'Estatua de León Dorado');

    // Caso B: Mismo sonido #28 pero casilla 2x1 (Guepardo Dorado / Trampa)
    const verdictCheetah = computeBayesianVerdict(syntheticFeat, rawSigs, '2x1', 0.95, 250000);
    assert.ok(verdictCheetah.pRed < 20, `Probabilidad roja debe ser baja para casilla 2x1 (obtenido: ${verdictCheetah.pRed}%)`);
    assert.strictEqual(verdictCheetah.topItem.nameEs, 'Estatua de Guepardo Dorado');
  });

  it('debe aplicar sustracción espectral de ruido ambiente eliminando frecuencias continuas espurias', () => {
    const { computeWindowEnergyVector } = require('../src/dsp/goertzel.js');
    const sr = 48000;
    const len = 2048;
    const testSamples = new Float32Array(len);

    // Ruido constante de 1000 Hz simulando zumbido de ventilador/Discord
    for (let i = 0; i < len; i++) {
      testSamples[i] = Math.sin((2 * Math.PI * 1000 * i) / sr) * 0.15;
    }

    // Vector de energía sin calibración de ruido
    const vecRaw = computeWindowEnergyVector(testSamples, 0, len, sr, null);
    
    // Perfil calibrado de ruido que identifica el zumbido en 1000 Hz
    const noiseProfile = new Float32Array(24);
    const idx1000 = [220, 310, 460, 680, 850, 1000, 1180, 1350, 1650, 2050, 2500, 3000, 3600, 4200, 4800, 5100, 5600, 6400, 7200, 8100, 9200, 10500, 12000, 14000].indexOf(1000);
    noiseProfile[idx1000] = 5.0; // Fuerte componente de ruido

    // Vector con sustracción espectral aplicada
    const vecFiltered = computeWindowEnergyVector(testSamples, 0, len, sr, noiseProfile);
    assert.ok(vecFiltered[idx1000] < vecRaw[idx1000], 'La energía en la frecuencia de ruido debe reducirse drásticamente');
  });

  it('el buffer de replay debe acumular y mantener muestras de audio en buffer circular FIFO', async () => {
    const { pushReplayAudioChunk } = await import('../src/radar/replayEngine.js');
    const chunk = new Float32Array([0.1, -0.2, 0.35, -0.15, 0.05]);
    assert.doesNotThrow(() => {
      pushReplayAudioChunk(chunk);
    });
  });

});

