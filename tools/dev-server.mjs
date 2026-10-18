// Dependency-free development server. Serves only dist/, on this computer.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('Choose a port from 1 to 65535: npm start -- 4174');
  process.exit(1);
}
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.zip': 'application/zip', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
  }
  try {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (!path.startsWith('/') || path.includes('\0') || path.includes('\\')) {
      res.writeHead(400); res.end(); return;
    }
    let file = resolve(root, '.' + path);
    if (file !== resolve(root) && !file.startsWith(resolve(root) + sep)) {
      res.writeHead(403); res.end(); return;
    }
    let info = await stat(file);
    if (info.isDirectory()) { file = resolve(file, 'index.html'); info = await stat(file); }
    if (!info.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
      'Content-Length': info.size, 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch (error) {
    res.writeHead(error instanceof URIError ? 400 : 404); res.end();
  }
});
server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE'
    ? 'Port is busy. Try: npm start -- 4174'
    : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Burnice Pixel Walk: http://127.0.0.1:${server.address().port}`);
  console.log('Keep this window open. Press Ctrl+C to stop. Refresh the browser after edits.');
});
