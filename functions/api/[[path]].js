const hopByHop = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];

function cleanHeaders(source) {
  const headers = new Headers(source);
  for (const name of (headers.get('connection') ?? '').split(',')) if (name.trim()) headers.delete(name.trim());
  for (const name of hopByHop) headers.delete(name);
  return headers;
}

function failure(status, code) {
  return Response.json({ code, message: 'Operación no confirmada' }, { status, headers: {
    'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
  } });
}

function origin(value, local) {
  const url = new URL(value);
  if (url.origin !== value || url.username || url.password ||
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('INVALID_ORIGIN');
  return url.origin;
}

export async function onRequest({ request, env }) {
  const incoming = new URL(request.url);
  let teacher, upstream;
  try {
    const local = incoming.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(incoming.hostname);
    teacher = origin(env.VITE_API_ORIGIN, local);
    upstream = origin(env.API_UPSTREAM_ORIGIN, local);
    if (teacher === upstream || incoming.origin !== teacher) return failure(503, 'UNAVAILABLE');
  } catch { return failure(503, 'UNAVAILABLE'); }

  // Reject ambiguous paths before another server can decode them differently.
  if (!incoming.pathname.startsWith('/api/') || /%2f|%5c|%2e|%25|\\|\/\//i.test(incoming.pathname)) return failure(404, 'NOT_FOUND');
  const sourceOrigin = request.headers.get('origin');
  if (sourceOrigin !== null && sourceOrigin !== teacher ||
    !['GET', 'HEAD'].includes(request.method) && sourceOrigin !== teacher) return failure(403, 'FORBIDDEN');

  const target = new URL(upstream);
  target.pathname = incoming.pathname;
  target.search = incoming.search;
  const headers = cleanHeaders(request.headers);
  for (const name of [...headers.keys()]) {
    if (name === 'host' || name === 'forwarded' || name.startsWith('x-forwarded-') || name === 'content-length') headers.delete(name);
  }
  headers.set('Cache-Control', 'no-store');
  const consentUpload = request.method === 'POST' && /^\/api\/v1\/students\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/consents$/.test(incoming.pathname);
  try {
    const forwarded = new Request(new Request(target, request), {
      headers, redirect: 'manual', cache: 'no-store',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(consentUpload ? 110_000 : 30_000)]),
    });
    const response = await fetch(forwarded);
    const output = cleanHeaders(response.headers);
    output.set('Cache-Control', 'no-store');
    output.set('Referrer-Policy', 'no-referrer');
    output.set('X-Content-Type-Options', 'nosniff');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: output });
  } catch { return failure(503, 'UNAVAILABLE'); }
}
