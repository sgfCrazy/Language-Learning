import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, 'dist');
const port = Number(process.env.PORT ?? 10086);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    let filePath = path.join(root, decodeURIComponent(url.pathname));
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    let exists = fs.existsSync(filePath);
    if (exists && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      exists = fs.existsSync(filePath);
    }
    if (!exists) {
      // SPA fallback：始终回退到 index.html 交给路由
      filePath = path.join(root, 'index.html');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': path.extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    fs.createReadStream(filePath).pipe(res);
  })
  .listen(port, () => {
    console.log(`Serving ${root} at http://localhost:${port}`);
  });