/**
 * ABI SOUND MASTER - AUDIO WORKLET PROCESSOR
 * Procesador de audio en hilo dedicado de alta prioridad (Zero-Dropout PCM Capture)
 */

class RadarPCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ringBuffer = new Float32Array(16384);
    this.ringWriteIdx = 0;
    this.movingAvgRms = 0.003;
    this.threshold = 0.008;
    this.cooldownUntil = 0;
    this.pendingCapture = null;
    this.sampleCount = 0;

    this.port.onmessage = (e) => {
      if (e.data.type === 'setThreshold') {
        this.threshold = e.data.threshold;
      } else if (e.data.type === 'triggerDrop') {
        // Disparo forzado por visión
        this.pendingCapture = {
          triggerIdx: this.ringWriteIdx,
          samplesRemaining: 5120
        };
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0];
    const numSamples = channelData.length;
    const ringLen = this.ringBuffer.length;
    let wIdx = this.ringWriteIdx;

    // 1. Almacenar muestras en el buffer circular
    for (let i = 0; i < numSamples; i++) {
      this.ringBuffer[(wIdx + i) % ringLen] = channelData[i];
    }
    this.ringWriteIdx = (wIdx + numSamples) % ringLen;

    // 2. Calcular RMS del bloque actual
    let sumSq = 0;
    for (let i = 0; i < numSamples; i++) {
      const v = channelData[i];
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / numSamples);

    // Calcular RMS de corto plazo (últimas 64 muestras)
    let stSumSq = 0;
    const stCount = Math.min(64, numSamples);
    for (let i = 0; i < stCount; i++) {
      const s = channelData[numSamples - 1 - i];
      stSumSq += s * s;
    }
    const shortRms = Math.sqrt(stSumSq / stCount);

    this.movingAvgRms = (this.movingAvgRms * 0.94) + (rms * 0.06);
    this.sampleCount += numSamples;

    // Reportar nivel RMS al hilo de UI cada ~50ms (2400 muestras a 48kHz)
    if (this.sampleCount >= 2400) {
      this.sampleCount = 0;
      this.port.postMessage({
        type: 'level',
        rms: rms,
        shortRms: shortRms
      });
    }

    const now = currentTime * 1000;

    // 3. Captura diferida en progreso
    if (this.pendingCapture) {
      this.pendingCapture.samplesRemaining -= numSamples;
      if (this.pendingCapture.samplesRemaining <= 0) {
        const trigIdx = this.pendingCapture.triggerIdx;
        this.pendingCapture = null;
        this.cooldownUntil = now + 350;

        // Extraer ventana de 8,192 muestras (2,048 pre-trigger + 6,144 resonancia)
        const analysisLen = 8192;
        const preTrigger = 2048;
        const analysisBuffer = new Float32Array(analysisLen);
        const readStart = (trigIdx - preTrigger + ringLen) % ringLen;

        for (let i = 0; i < analysisLen; i++) {
          analysisBuffer[i] = this.ringBuffer[(readStart + i) % ringLen];
        }

        this.port.postMessage({
          type: 'transientCaptured',
          buffer: analysisBuffer
        }, [analysisBuffer.buffer]);
      }
      return true;
    }

    // 4. Detección de Disparo Transitorio
    const isDynamicSpike = (shortRms > this.movingAvgRms * 1.85 && shortRms >= 0.005);
    const isAbsoluteThreshold = (rms >= this.threshold || shortRms >= this.threshold);

    if ((isDynamicSpike || isAbsoluteThreshold) && now > this.cooldownUntil) {
      this.pendingCapture = {
        triggerIdx: this.ringWriteIdx,
        samplesRemaining: 5120
      };
      this.port.postMessage({ type: 'triggerStart' });
    }

    return true;
  }
}

registerProcessor('radar-pcm-processor', RadarPCMProcessor);

