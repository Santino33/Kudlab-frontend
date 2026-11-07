import { randomBytes } from 'node:crypto';
import { open, readFile, unlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const secret = () => randomBytes(32).toString('hex');
function syntheticSettings(content = '') {
  const settings = new Map();
  for (const line of content.split(/\r?\n/)) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (!match) continue;
    if (settings.has(match[1])) throw new Error('Hay ajustes duplicados; revisar el archivo local antes de ampliarlo.');
    const value = match[2].trim();
    settings.set(match[1], /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value);
  }
  const additions = [];
  function add(key, value) { if (!settings.has(key)) { settings.set(key, value); additions.push(`${key}=${key.endsWith('_KEYS') ? `'${value}'` : value}`); } }
  for (const key of ['KUDLAB_LOCAL_SYNTHETIC_ENABLED', 'KUDLAB_LOCAL_SYNTHETIC_DATA_CONFIRMED', 'GAME_ACCESS_ENABLED']) {
    add(key, 'true');
    if (settings.get(key) !== 'true') throw new Error(`Revise ${key} en el archivo local: el setup no reemplaza ajustes existentes.`);
  }
  add('GAME_ACCESS_LOOKUP_KEY', secret()); add('GAME_ACCESS_IP_KEY', secret());
  add('GAME_ACCESS_ACTIVE_KEY_ID', 'local-access');
  const id = settings.get('GAME_ACCESS_ACTIVE_KEY_ID');
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(id)) throw new Error('GAME_ACCESS_ACTIVE_KEY_ID inválido.');
  add('GAME_ACCESS_KEYS', JSON.stringify({ [id]: secret() }));
  try {
    const keys = JSON.parse(settings.get('GAME_ACCESS_KEYS'));
    const grants = JSON.parse(settings.get('GAME_GRANT_KEYS') ?? '{}');
    if (!keys || Array.isArray(keys) || typeof keys !== 'object' || !Object.hasOwn(keys, id) ||
      Object.keys(keys).some(key => !/^[a-zA-Z0-9_-]{1,32}$/.test(key)) || !grants || typeof grants !== 'object' || Array.isArray(grants)) throw new Error();
    const values = [settings.get('GAME_ACCESS_LOOKUP_KEY'), settings.get('GAME_ACCESS_IP_KEY'), ...Object.values(keys)];
    const reserved = [settings.get('GAME_CURSOR_KEY'), ...Object.values(grants)];
    if (values.some(value => typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value) || reserved.includes(value)) || new Set(values).size !== values.length) throw new Error();
  } catch { throw new Error('Claves de códigos inválidas o compartidas. Revise los ajustes locales; no se rotaron secretos.'); }
  return additions.length ? `\n# Composición local exclusivamente sintética confirmada por el operador.\n${additions.join('\n')}\n` : '';
}

try {
  const args = process.argv.slice(2);
  if (args.includes('--extend-synthetic-local')) {
    if (args.length !== 2 || !args.includes('--confirm-synthetic-data')) throw new Error('Para ampliar: --extend-synthetic-local --confirm-synthetic-data');
    const lock = await open('.env.docker.setup.lock', 'wx', 0o600);
    try {
      const file = await open('.env.docker', constants.O_RDWR | constants.O_NOFOLLOW);
      try {
        const info = await file.stat();
        if (!info.isFile() || (info.mode & 0o077)) throw new Error('.env.docker debe ser un archivo privado (permisos 600).');
        const content = await file.readFile('utf8'), additions = syntheticSettings(content);
        if (additions) {
          try { await file.writeFile(additions); await file.sync(); }
          catch (error) { await file.truncate(info.size); throw error; }
        }
        console.log(additions ? 'Añadidos solo los ajustes faltantes. Configuración previa y secretos conservados.' : 'Configuración sintética completa; sin cambios.');
      } finally { await file.close(); }
    } finally { await lock.close(); await unlink('.env.docker.setup.lock'); }
  } else {
  const [backend, play, ...flags] = args;
  const synthetic = flags.includes('--synthetic-local');
  if (!backend || !play || flags.length !== (synthetic ? 2 : 0) || synthetic && !flags.includes('--confirm-synthetic-data')) throw new Error('Uso: npm run docker:setup -- /ruta/backend /ruta/play [--synthetic-local --confirm-synthetic-data]');
  const paths = [resolve(backend), resolve(play)];
  for (const [index, name] of ['kudlab-backend', 'kudlab-play'].entries()) {
    const pkg = JSON.parse(await readFile(resolve(paths[index], 'package.json'), 'utf8'));
    if (pkg.name !== name) throw new Error(`La ruta indicada no corresponde a ${name}`);
    await readFile(resolve(paths[index], 'Dockerfile'));
    await readFile(resolve(paths[index], '.dockerignore'));
  }
  const template = await readFile(new URL('../.env.docker.example', import.meta.url), 'utf8');
  let content = template.replace('__BACKEND_DIR__', () => JSON.stringify(paths[0]))
    .replace('__PLAY_DIR__', () => JSON.stringify(paths[1]))
    .replaceAll('__RANDOM_HEX__', secret);
  if (synthetic) content += syntheticSettings(content);
  await writeFile('.env.docker', content, { flag: 'wx', mode: 0o600 });
  console.log('.env.docker creado con secretos locales independientes. Credenciales del administrador en ese archivo; no compartirlo.');
  }
} catch (error) {
  console.error(error.code === 'EEXIST' ? '.env.docker ya existe; no se sobrescribió ni rotó ningún secreto.' : error.message);
  process.exitCode = 1;
}
