"""
Script Generador de Firmas Acústicas para ABI Sound Master
Calcula y exporta las 76 huellas espectro-temporales (Drop + Pickup)
en radar_signatures.json para permitir carga instantánea a 0ms.
"""

import math
import json
import os
import subprocess
import soundfile as sf
import numpy as np

RADAR_FREQS = [
    90, 140, 220, 320, 460, 650, 850, 1050, 1350, 1650, 2050, 2500,
    2950, 3450, 4200, 4650, 5100, 5700, 6400, 7400, 8800, 10200, 11800, 13800
]

def goertzel_energy(samples, target_freq, sample_rate):
    N = len(samples)
    if N == 0:
        return 0.0
    k = round((N * target_freq) / sample_rate)
    omega = (2.0 * math.pi * k) / N
    coeff = 2.0 * math.cos(omega)
    s0 = 0.0
    s1 = 0.0
    s2 = 0.0
    for x in samples:
        s0 = float(x) + coeff * s1 - s2
        s2 = s1
        s1 = s0
    return max(0.0, s1 * s1 + s2 * s2 - coeff * s1 * s2)

def compute_window_energy_vector(samples, offset, length, sample_rate, noise_spectrum=None):
    N = min(length, len(samples) - offset)
    if N <= 0:
        return [0.0] * len(RADAR_FREQS)
    
    # Hann window
    indices = np.arange(N)
    hann = 0.5 * (1.0 - np.cos((2.0 * np.pi * indices) / (N - 1 if N > 1 else 1)))
    windowed = samples[offset:offset + N] * hann
    
    vec = []
    total_energy = 0.0
    for f in RADAR_FREQS:
        e = math.sqrt(goertzel_energy(windowed, f, sample_rate))
        if noise_spectrum and noise_spectrum.get(str(f), 0) > 0:
            e = max(0.0, e - noise_spectrum[str(f)] * 1.25)
        vec.append(e)
        total_energy += e
        
    if total_energy > 0:
        vec = [v / total_energy for v in vec]
    return vec

def extract_acoustic_features(samples, sample_rate, noise_spectrum=None):
    scan_len = min(len(samples), round(sample_rate * 0.9))
    abs_samples = np.abs(samples[:scan_len])
    peak_idx = int(np.argmax(abs_samples)) if len(abs_samples) > 0 else 0
    
    # Slice 1: Ataque (0 a 35 ms)
    s1_offset = max(0, peak_idx - 128)
    s1_len = min(1536, len(samples) - s1_offset)
    slice1 = compute_window_energy_vector(samples, s1_offset, s1_len, sample_rate, noise_spectrum)
    
    # Slice 2: Resonancia cuerpo (35 a 100 ms)
    s2_offset = min(len(samples) - 1, peak_idx + 384)
    s2_len = min(3072, len(samples) - s2_offset)
    slice2 = compute_window_energy_vector(samples, s2_offset, s2_len, sample_rate, noise_spectrum)
    
    # Slice 3: Cola de decaimiento (100 a 200 ms)
    s3_offset = min(len(samples) - 1, peak_idx + 2560)
    s3_len = min(3072, len(samples) - s3_offset)
    slice3 = compute_window_energy_vector(samples, s3_offset, s3_len, sample_rate, noise_spectrum)
    
    # Envolvente 16 puntos
    env16 = [0.0] * 16
    env_start = max(0, peak_idx - 256)
    step_size = math.floor(min(len(samples) - env_start, 8192) / 16)
    max_env = 0.0
    
    if step_size > 0:
        for k in range(16):
            b_start = env_start + (k * step_size)
            b_end = min(len(samples), b_start + step_size)
            count = max(1, b_end - b_start)
            segment = samples[b_start:b_end]
            sum_sq = float(np.sum(segment * segment))
            rms = math.sqrt(sum_sq / count)
            env16[k] = rms
            if rms > max_env:
                max_env = rms
        if max_env > 0:
            env16 = [val / max_env for val in env16]
            
    # Parámetros físicos
    weighted_freq = 0.0
    high_freq_sum = 0.0
    low_freq_sum = 0.0
    log_sum = 0.0
    max_band_val = 0.0
    max_band_idx = 0
    
    for idx, f in enumerate(RADAR_FREQS):
        p = slice2[idx]
        weighted_freq += f * p
        if f >= 3400:
            high_freq_sum += p
        if f <= 900:
            low_freq_sum += p
        log_sum += math.log(max(1e-6, p))
        if p > max_band_val:
            max_band_val = p
            max_band_idx = idx
            
    num_freqs = len(RADAR_FREQS)
    geometric_mean = math.exp(log_sum / num_freqs)
    arithmetic_mean = 1.0 / num_freqs
    spectral_flatness = geometric_mean / arithmetic_mean
    
    return {
        "slice1": [round(x, 6) for x in slice1],
        "slice2": [round(x, 6) for x in slice2],
        "slice3": [round(x, 6) for x in slice3],
        "vector": [round(x, 6) for x in slice2],
        "env16": [round(x, 6) for x in env16],
        "centroid": round(weighted_freq, 2),
        "highRatio": round((high_freq_sum + 0.001) / (low_freq_sum + 0.001), 4),
        "spectralFlatness": round(spectral_flatness, 6),
        "dominantFreq": RADAR_FREQS[max_band_idx]
    }

def main():
    print("=== Generando Firmas Acústicas para ABI Sound Master ===")
    
    # Obtener sounds de app_data.js
    node_cmd = ["node", "-e", """
const fs = require('fs');
const content = fs.readFileSync('app_data.js', 'utf8');
const data = new Function(content + '; return ABI_DATA;')();
console.log(JSON.stringify(data.sounds));
"""]
    res = subprocess.check_output(node_cmd, encoding='utf-8')
    sounds = json.loads(res)
    
    templates = []
    
    for s in sounds:
        # 1. DROP
        drop_file = s['drop']
        drop_path = os.path.join('audio', f"{drop_file}.ogg")
        if os.path.exists(drop_path):
            data, sr = sf.read(drop_path)
            samples = data[:, 0] if data.ndim > 1 else data
            feat = extract_acoustic_features(samples, sr)
            templates.append({
                "sound": s,
                "action": "drop",
                "file": drop_file,
                "slice1": feat["slice1"],
                "slice2": feat["slice2"],
                "slice3": feat["slice3"],
                "env16": feat["env16"],
                "vector": feat["vector"],
                "centroid": feat["centroid"],
                "highRatio": feat["highRatio"],
                "spectralFlatness": feat["spectralFlatness"],
                "dominantFreq": feat["dominantFreq"]
            })
            print(f"  [OK] DROP: {drop_file} -> Pico {feat['dominantFreq']}Hz, Centroide {feat['centroid']}Hz")
        else:
            print(f"  [ALERTA] Archivo no encontrado: {drop_path}")
            
        # 2. PICKUP
        up_file = s['pickup']
        up_path = os.path.join('audio', f"{up_file}.ogg")
        if os.path.exists(up_path):
            data, sr = sf.read(up_path)
            samples = data[:, 0] if data.ndim > 1 else data
            feat = extract_acoustic_features(samples, sr)
            templates.append({
                "sound": s,
                "action": "pickup",
                "file": up_file,
                "slice1": feat["slice1"],
                "slice2": feat["slice2"],
                "slice3": feat["slice3"],
                "env16": feat["env16"],
                "vector": feat["vector"],
                "centroid": feat["centroid"],
                "highRatio": feat["highRatio"],
                "spectralFlatness": feat["spectralFlatness"],
                "dominantFreq": feat["dominantFreq"]
            })
            print(f"  [OK] PICKUP: {up_file} -> Pico {feat['dominantFreq']}Hz, Centroide {feat['centroid']}Hz")
        else:
            print(f"  [ALERTA] Archivo no encontrado: {up_path}")
            
    output_path = 'radar_signatures.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(templates, f, ensure_ascii=False, indent=2)
        
    size_kb = os.path.getsize(output_path) / 1024
    print(f"\n[ÉXITO] Generadas {len(templates)} firmas acústicas en '{output_path}' ({size_kb:.1f} KB)")

if __name__ == '__main__':
    main()

