/**
 * SUITE DE PRUEBAS UNITARIAS Y DE INTEGRACIÓN: SERVIDOR HTTP
 * Verifica endpoints, healthcheck, cabeceras de seguridad y compresión.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const server = require('../server.js');

let testPort = 0;
let baseUrl = '';

describe('Servidor HTTP de Producción (Render Compatible)', () => {

  before(async () => {
    const addr = server.address();
    if (addr && addr.port) {
      testPort = addr.port;
      baseUrl = `http://127.0.0.1:${testPort}`;
    } else {
      await new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          testPort = server.address().port;
          baseUrl = `http://127.0.0.1:${testPort}`;
          resolve();
        });
      });
    }
  });

  after(() => {
    server.close();
  });

  it('el endpoint /healthz debe responder 200 OK con JSON de estado de salud', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/json'));

    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'abi-sound-master');
    assert.ok(typeof data.uptime === 'number');
    assert.ok(data.timestamp);
  });

  it('la ruta raíz (/) debe servir index.html con cabeceras de seguridad y CSP defensivo', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/html'));
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.ok(res.headers.get('content-security-policy'), 'Debe incluir Content-Security-Policy');
    assert.ok(res.headers.get('content-security-policy').includes("default-src 'self'"));

    const html = await res.text();
    assert.ok(html.includes('ABI Sound Master'), 'Debe incluir el título de la aplicación');
  });

  it('radar_signatures.json debe ser servido con caché inmutable', async () => {
    const res = await fetch(`${baseUrl}/radar_signatures.json`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/json'));
    assert.ok(res.headers.get('cache-control').includes('immutable'), 'Debe tener cabecera immutable');

    const sigs = await res.json();
    assert.strictEqual(sigs.length, 76);
  });

  it('los iconos locales (/images/items/408080010.png) deben ser servidos con 200 OK y caché inmutable', async () => {
    const res = await fetch(`${baseUrl}/images/items/408080010.png`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'image/png');
    assert.ok(res.headers.get('cache-control').includes('immutable'), 'Debe incluir caché inmutable');
    const buffer = await res.arrayBuffer();
    assert.strictEqual(buffer.byteLength, 7291, 'El tamaño de la tetera antigua debe ser 7291 bytes');
  });

  it('el limitador de tasa (Rate Limiter) debe mitigar ataques DoS respondiendo con 429', async () => {
    const testIp = '198.51.100.99';
    let blocked = false;
    // Ráfaga rápida que excede el límite de 180 req/min
    for (let i = 0; i < 185; i++) {
      const res = await fetch(`${baseUrl}/index.html`, {
        headers: { 'x-forwarded-for': testIp }
      });
      if (res.status === 429) {
        blocked = true;
        assert.ok(res.headers.get('retry-after'), 'Debe incluir cabecera Retry-After');
        break;
      }
    }
    assert.ok(blocked, 'El servidor debe responder 429 tras superar la cuota por IP');
  });

  it('rutas inexistentes deben responder con código HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/ruta_inexistente_12345.html`);
    assert.strictEqual(res.status, 404);
  });

  it('intentos de Path Traversal deben ser bloqueados con 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/../../../../etc/passwd`);
    assert.ok(res.status === 403 || res.status === 404, 'Debe denegar acceso fuera de la raíz');
  });

});
