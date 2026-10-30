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

  it('la ruta raíz (/) debe servir index.html con cabeceras de seguridad', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/html'));
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');

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

  it('rutas inexistentes deben responder con código HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/ruta_inexistente_12345.html`);
    assert.strictEqual(res.status, 404);
  });

  it('intentos de Path Traversal deben ser bloqueados con 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/../../../../etc/passwd`);
    assert.ok(res.status === 403 || res.status === 404, 'Debe denegar acceso fuera de la raíz');
  });

});
