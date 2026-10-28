export function assertPreviewOrigins(teacherOrigins, playOrigins, { teacherOrigin, apiOrigin, playOrigin }) {
  if (!teacherOrigins.includes(apiOrigin) || !teacherOrigins.includes(playOrigin) ||
    !playOrigins.includes(apiOrigin) || !playOrigins.includes(teacherOrigin)) {
    throw new Error('PREVIEW_ORIGINS_MISMATCH: Kudlab y Play deben usar la misma API y sus orígenes recíprocos. No continúes con bases distintas.');
  }
}

export async function compiledOrigins(origin) {
  const html = await fetch(origin).then(r => { if (!r.ok) throw new Error('PREVIEW_UNAVAILABLE'); return r.text(); });
  const scripts = [...html.matchAll(/src="([^\"]+\.js)"/g)].map(match => new URL(match[1], origin));
  if (!scripts.length) throw new Error('BUILT_PREVIEW_REQUIRED');
  const source = await Promise.all(scripts.map(async url => {
    if (url.origin !== origin) throw new Error('LOCAL_BUILD_REQUIRED');
    const response = await fetch(url); if (!response.ok) throw new Error('PREVIEW_ASSET_UNAVAILABLE');
    return response.text();
  }));
  return [...new Set(source.join('\n').match(/http:\/\/(?:localhost|127\.0\.0\.1):\d+/g) ?? [])];
}
