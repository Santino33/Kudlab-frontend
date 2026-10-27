import { writeFile } from 'node:fs/promises';
import { loadEnv } from 'vite';
const env = loadEnv('production', process.cwd(), 'VITE_');
const api = env.VITE_API_ORIGIN || 'https://api.invalid', play = env.VITE_PLAY_ORIGIN || 'https://play.invalid';
for (const origin of [api, play]) {
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password || url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('INVALID_PUBLIC_ORIGIN');
}
await writeFile('dist/_headers', `/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src ${api}; frame-src ${play}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cache-Control: no-cache
`);
