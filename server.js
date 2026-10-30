/**
 * ABI SOUND MASTER - PRODUCTION HTTP SERVER (RENDER READY)
 * Servidor HTTP/1.1 de alto rendimiento en Node.js puro sin dependencias externas.
 * Implementa compresión Gzip, cabeceras de seguridad OWASP, cacheo HTTP y healthcheck.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const HOST = '0.0.0.0';
const ROOT_DIR = process.cwd();

// Catálogo MIME exhaustivo
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ogg': 'audio/ogg',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8'
};

// Cabeceras de seguridad defensivas estándar
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'display-capture=(self), microphone=(self)',
  'Access-Control-Allow-Origin': '*'
};

const server = http.createServer((req, res) => {
  const startTime = Date.now();

  // 1. Endpoint de Monitoreo y Health Check para Render
  if (req.url === '/healthz' || req.url === '/ping') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      ...SECURITY_HEADERS,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'abi-sound-master',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 2. Solo permitir métodos GET y HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('Method Not Allowed');
    return;
  }

  // 3. Resolución segura de rutas y prevención de Path Traversal
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(path.join(ROOT_DIR, pathname));

  // Verificar que la ruta no escape del directorio raíz
  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('403 Forbidden: Path traversal prohibited');
    return;
  }

  // 4. Verificar existencia del archivo
  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS });
      res.end(`
        <!DOCTYPE html>
        <html lang="es">
        <head><title>404 - No Encontrado | ABI Sound Master</title></head>
        <body style="background:#070a0f;color:#f1f5f9;font-family:sans-serif;padding:3rem;text-align:center;">
          <h1 style="color:#ef4444;">404 - Recurso No Encontrado</h1>
          <p>La ruta solicitada no existe en el radar táctico.</p>
          <a href="/" style="color:#06b6d4;">Volver a la Base de Operaciones</a>
        </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // 5. Políticas de Cache-Control diferenciadas
    let cacheControl = 'public, max-age=3600'; // 1 hora por defecto
    if (ext === '.ogg' || ext === '.png' || ext === '.jpg' || safePath.includes('radar_signatures.json')) {
      // Activos pesados inmutables: 7 días
      cacheControl = 'public, max-age=604800, immutable';
    } else if (ext === '.html' || safePath.endsWith('sw.js') || safePath.endsWith('manifest.json')) {
      // HTML y Service Worker: Revalidación obligatoria
      cacheControl = 'no-cache, no-store, must-revalidate';
    }

    // Cabeceras de respuesta
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'ETag': `W/"${stats.size}-${stats.mtime.getTime()}"`,
      ...SECURITY_HEADERS
    };

    // 6. Manejo de If-None-Match (HTTP 304 Not Modified)
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag && clientEtag === headers['ETag']) {
      res.writeHead(304, headers);
      res.end();
      return;
    }

    // 7. Compresión Gzip / Deflate para archivos de texto / código / json
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const isCompressible = /text|javascript|json|svg/.test(contentType);

    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return;
    }

    const rawStream = fs.createReadStream(safePath);

    if (isCompressible && acceptEncoding.includes('gzip')) {
      headers['Content-Encoding'] = 'gzip';
      res.writeHead(200, headers);
      rawStream.pipe(zlib.createGzip()).pipe(res);
    } else if (isCompressible && acceptEncoding.includes('deflate')) {
      headers['Content-Encoding'] = 'deflate';
      res.writeHead(200, headers);
      rawStream.pipe(zlib.createDeflate()).pipe(res);
    } else {
      headers['Content-Length'] = stats.size;
      res.writeHead(200, headers);
      rawStream.pipe(res);
    }
  });
});

// Inicio del servidor
server.listen(PORT, HOST, () => {
  console.log(`========================================================`);
  console.log(`🎧 ABI SOUND MASTER - SERVIDOR DE PRODUCCIÓN INICIADO`);
  console.log(`🌐 Escuchando en: http://${HOST}:${PORT}`);
  console.log(`🏥 Healthcheck:  http://${HOST}:${PORT}/healthz`);
  console.log(`🚀 Modo: Producción escalable (Zero-Dependencies)`);
  console.log(`========================================================`);
});

// Parada elegante (Graceful Shutdown)
function handleShutdown(signal) {
  console.log(`\n[Server] Señal ${signal} recibida. Cerrando conexiones...`);
  server.close(() => {
    console.log('[Server] Servidor cerrado con éxito.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[Server] Cierre forzado tras timeout.');
    process.exit(1);
  }, 4000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;

