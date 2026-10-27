// Verification server only: applies dist/_headers and SPA fallback to the production build.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const headers = Object.fromEntries((await readFile('dist/_headers', 'utf8')).trim().split('\n').slice(1).map(line => { const n = line.indexOf(':'); return [line.slice(0, n).trim(), line.slice(n + 1).trim()]; }));
const mime = { html: 'text/html', js: 'text/javascript', css: 'text/css' };
createServer(async (req, res) => {
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = /^\/assets\/[A-Za-z0-9_.-]+$/.test(path) ? path : '/index.html';
  try { const data = await readFile(`dist${file}`); res.setHeader('Content-Type', mime[file.split('.').at(-1)] ?? 'application/octet-stream'); res.end(data); }
  catch { res.writeHead(404); res.end(); }
}).listen(Number(process.env.PORT ?? 5173), '127.0.0.1', () => console.log('J02_FRONTEND_BUILD_READY'));
