# 🎧 ABI SOUND MASTER — Entrenador de Oído y Asistente de Vendedor de Campo

> **Herramienta táctica para Arena Breakout: Infinite (Temporada 7: Utopia)**  
> Entrena tu oído para detectar **Ítems Rojos (Rareza 6)** en las Cajas Misteriosas (*Mystery Cargo*) del Vendedor de Campo (*Field Merchant*) antes de gastar tus Koens en raid.

---

## 🧐 ¿Cómo funciona el truco del sonido en ABI?

En la Temporada 7 de *Arena Breakout: Infinite*, el **Vendedor de Campo** ofrece cajas misteriosas (*Mystery Cargo*) con precios desde **70,000** hasta **550,000 Koens**. 

Aunque el contenido de la caja está oculto visualmente:
1. Al **arrastrar (Pickup)** o **soltar (Drop)** la caja en el inventario dentro de la partida, el juego reproduce el **sonido físico real del ítem interior**.
2. Los objetos de alto valor (León Dorado, Tetera Antigua, Jarrón, Módulo TI, etc.) emiten firmas acústicas específicas (tintineos de porcelana fina, impacto de escultura metálica, clics de circuitos militares).
3. Con este entrenador y asistente, puedes memorizar y comparar los sonidos en tiempo real para no comprar chatarra y asegurar ganancias millonarias en Koens.

---

## 🚀 Características Principales

### 1. 🎯 Modo Entrenador de Oído (Quiz & Arcade)
- **Simulación Real:** Se te presenta una caja misteriosa con su tamaño (ej. `2x2`, `2x3`) y precio de mercado.
- **Botones de Audio:** Escucha el **DROP** (soltar), **PICKUP** (arrastrar) o el **Ciclo Completo** con visualizador de ondas acústicas en tiempo real.
- **Toma de Decisión Táctica:** 
  - 🔴 **¡SÍ, ES UN ROJO!** (Comprar)
  - ⚪ **NO ES ROJO / PASAR** (Ahorrar Koens)
- **Animación de Revelación:** Muestra el ítem real, su imagen oficial en HD, rareza, precio de mercado y un consejo acústico detallado.
- **Sistema de Rango y Racha:** 
  - Gana o pierde Koens virtuales según tus decisiones en raid.
  - Sube de rango: *Recluta de Campo* ➔ *Oído Táctico* ➔ *Cazador de Rojos* ➔ *Comerciante Veterano* ➔ *Maestro de la Zona Oscura*.
  - Atajos de teclado: Espacio para escuchar, Flechas para decidir, Enter para siguiente ronda.

### 2. 🔴 Radar Acústico y Visión Multimodal en Vivo (Detector Automático de Rojos 2.0)
- **Detección Multimodal (Visión por Computador + Audio DSP):**
  - **Análisis de Pantalla en Tiempo Real:** Detecta cuando arrastras un objeto y calcula automáticamente el tamaño de casilla (`1x1`, `1x2`, `2x2`, `2x3`, etc.) a partir de la cuadrícula o silueta en movimiento.
  - **Disparador Visual de Drop:** Sincroniza la ventana acústica exacta al soltar la caja, eliminando disparos accidentales por disparos, pasos o chat de voz.
  - **Carga Instantánea a 0ms:** 76 firmas acústicas precomputadas en `radar_signatures.json` para arranque inmediato sin esperas.
  - **AudioWorkletProcessor:** Captura PCM contigua a 48 kHz en hilo de audio dedicado de alta prioridad (cero pérdida de muestras durante juego intenso).
- **🪟 HUD Flotante Táctico (Picture-in-Picture / Always-on-Top):**
  - Abre una mini-pantalla táctica flotante sobre tu juego de *Arena Breakout: Infinite* para ver el veredicto en tiempo real sin requerir segundo monitor ni hacer Alt+Tab.
- **Dos Modos de Captura de Audio:**
  - 🔊 **Audio y Pantalla del Sistema (Recomendado):** Captura directa digital limpia sin ruidos externos (vía *Compartir Audio y Pantalla* en el navegador).
  - 🎤 **Micrófono / Mezcla Estéreo:** Para configuraciones con altavoces externos o Cable Virtual.
- **Algoritmo de Huella Espectral (Web Audio DSP):**
  - Descompone el transitorio en 24 bandas de frecuencia clave (desde impactos sordos de 90 Hz hasta resonancias de porcelana de 5.1 kHz y metales finos de 6.4 kHz).
  - Compara en tiempo real contra las 76 firmas acústicas oficiales con envolvente temporal de 16 puntos y similitud multi-fase.
  - Veredicto visual y sonoro inmediato:
    - 🔴 **¡ALERTA ROJO 100% GARANTIZADO!** (Tetera Antigua, etc.)
    - 🟡 **POSIBLE ROJO / RIESGO** (León vs Guepardo, TI Module)
    - ⚪ **DESCARTAR / CHATARRA (0% Rojo)**
- **Medidor VU de Sensibilidad:** Deslizador de umbral con auto-calibración de ruido ambiental de raid.
- **PWA Offline:** Totalmente utilizable sin conexión gracias a Service Worker y Web Manifest.

### 3. 📡 Asistente de Raid en Vivo (Calculador de Campo)
- Diseñado para tener abierto en tu segundo monitor o teléfono mientras juegas ABI:
- **Paso 1:** Selecciona el tamaño de la caja en casillas (`1x1`, `1x2`, `2x1`, `2x2`, `2x3`, `3x2`).
- **Paso 2:** Selecciona el precio de la caja (`250k`, `350k`, `470k`, `550k`).
- **Paso 3:** La herramienta te lista inmediatamente solo los sonidos compatibles:
  - 🔥 **100% GARANTÍA ROJO** (Ej. Tetera #32, o León #28 en 3x2).
  - 🟡 **PROBABLE / RIESGO** (Contiene Rojo pero comparte con dorado/morado).
  - ⚪ **0% ROJO** (Descarte seguro).
- Botones de reproducción inmediata para contrastar con lo que escuchas en el juego en ese momento.

### 3. 💎 Los 32 Ítems Rojos (Soundboard & Enciclopedia)
- Catálogo completo de los **32 Ítems Rojos de Máximo Valor**:
  - Estatua de León Dorado (`1.54M K`)
  - Jarrón de Porcelana / Vase (`1.37M K`)
  - Tetera Antigua (`1.41M K`)
  - Módulo TI (`1.33M K`)
  - Escultura Majestuosa (`1.58M K`)
  - Réplica Máscara de Oro Antigua (`1.64M K`)
  - "Amanecer" / Dawn (`1.64M K`)
  - Televisor de Cápsula (`1.62M K`)
  - Caja de Música Jaula Dorada (`1.62M K`), etc.
- Reproducción instantánea de Drop y Pickup con alerta de posibles trampas o imitaciones.

### 4. ⚖️ Comparador Acústico A / B
- Duelos acústicos predefinidos para afinar el oído entre un ítem Rojo y su trampa más común:
  - *León Dorado (Rojo)* vs *Guepardo Dorado (Dorado)*
  - *Jarrón de Porcelana (Rojo)* vs *Muestra de Corazón Mutante (Dorado)*
  - *Módulo TI (Rojo)* vs *Carcasa de Circuito (Morado)*
  - *Máscara de Oro (Rojo)* vs *Tijeras Médicas (Común)*
  - *Laúd Doble Mástil (Rojo)* vs *Monitor de Estudio (Dorado)*
- Función de reproducción secuencial automática (A ➔ Pausa de 1s ➔ B).

### 5. 📖 Guía Táctica y Tabla Maestra (Cheat Sheet)
- Explicación de los 10 sonidos clave de ítems rojos con su porcentaje de certeza y consejos de descarte.

---

## 💻 Cómo Iniciar

### Opción 1: Servidor de Alto Rendimiento (Node.js)
```bash
npm start
```
Inicia el servidor HTTP de producción optimizado con Gzip y cabeceras de seguridad en `http://localhost:8080`.

### Opción 2: Lanzador Automático en Windows
Haz doble clic en:
```text
start_trainer.bat
```

### Opción 3: Manual con Python
```bash
python -m http.server 8080
```

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una suite completa de pruebas unitarias y de integración que se ejecutan directamente con el test runner nativo de Node.js (sin librerías externas):

```bash
npm test
```
Verifica:
* Detección espectral precisa con filtros Goertzel.
* Cálculo de similitud de coseno y correlación de Pearson.
* Integridad de la base de datos `ABI_DATA` y firmas precompiladas.
* Salud del servidor, endpoints `/healthz`, caché inmutable y protección contra Path Traversal.

---

## ☁️ Despliegue en Render (Render.com)

El proyecto está 100% preparado para ser desplegado en **Render** como un Web Service de alto rendimiento con **0 dependencias externas**:

### Método 1: Despliegue con 1 Clic (Render Blueprint)
1. Sube tu repositorio a GitHub.
2. En [dashboard.render.com](https://dashboard.render.com/), haz clic en **New +** ➔ **Blueprint**.
3. Conecta este repositorio. Render detectará automáticamente el archivo [`render.yaml`](file:///c:/Users/Alejandro%20Rivero/Documents/GitHub/ABI-AUD/render.yaml) y configurará el servicio web, healthcheck (`/healthz`) y puerto de producción.
4. ¡Listo! Tu app estará activa en `https://tu-proyecto.onrender.com`.

### Método 2: Configuración Manual como Web Service
* **Name:** `abi-sound-master`
* **Runtime:** `Node`
* **Build Command:** *(dejar vacío)*
* **Start Command:** `npm start`
* **Health Check Path:** `/healthz`
* **Plan:** `Free`

---

## 📁 Estructura Modular del Proyecto

```text
ABI-AUD/
├── src/
│   ├── core/
│   │   ├── constants.js        # 24 frecuencias, presets de sensibilidad y rangos
│   │   └── state.js            # Estado reactivo y persistencia LocalStorage
│   ├── dsp/
│   │   ├── goertzel.js         # Filtros Goertzel y ventaneo Hann
│   │   ├── features.js         # Huella multi-fase (3 slices + 16-point envelope)
│   │   └── similarity.js       # Similitud de coseno y correlación de Pearson
│   ├── audio/
│   │   └── audioEngine.js      # AudioContext, sintetizador SFX y visualizador
│   ├── vision/
│   │   └── visionEngine.js     # Detección de arrastre y clasificación de casillas
│   ├── radar/
│   │   ├── radarEngine.js      # Captura de audio, buffer circular y emparejamiento
│   │   └── scopeRenderer.js    # Osciloscopio Canvas y espectrómetro de 24 bandas
│   ├── trainer/
│   │   └── trainerEngine.js    # Rondas misteriosas, decisiones y economía de Koens
│   ├── assistant/
│   │   └── assistantView.js    # Calculador de probabilidades en raid
│   ├── encyclopedia/
│   │   └── encyclopediaView.js # Catálogo interactivo de ítems rojos
│   ├── compare/
│   │   └── compareView.js      # Comparador A/B entre rojos y trampas doradas
│   ├── cheatsheet/
│   │   └── cheatsheetView.js   # Tabla de referencia táctica
│   ├── ui/
│   │   ├── pipOverlay.js       # Document Picture-in-Picture (Overlay flotante)
│   │   └── domController.js    # Enlace de eventos DOM y atajos de teclado
│   └── main.js                 # Bootstrapper principal de la aplicación (ESM)
├── tests/
│   ├── dsp.test.js             # Pruebas unitarias matemáticas de DSP
│   ├── data.test.js            # Pruebas de integridad de catálogo y firmas
│   └── server.test.js          # Pruebas de integración del servidor HTTP
├── audio/                      # 76 archivos de audio oficiales .ogg
├── radar_signatures.json       # 76 firmas acústicas precomputadas (0ms)
├── server.js                   # Servidor HTTP de producción sin dependencias (Render)
├── render.yaml                 # Especificación Render Blueprint IaC
├── package.json                # Configuración de scripts y metadatos
├── sw.js                       # Service Worker para modo PWA offline
├── manifest.json               # Manifiesto de aplicación web instalable
└── index.html                  # HTML semántico y responsivo
```
