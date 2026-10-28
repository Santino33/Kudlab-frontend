import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

try {
  const [backend, play] = process.argv.slice(2);
  if (!backend || !play || process.argv.length !== 4) throw new Error('Uso: npm run docker:setup -- /ruta/backend /ruta/play');
  const paths = [resolve(backend), resolve(play)];
  for (const [index, name] of ['kudlab-backend', 'kudlab-play'].entries()) {
    const pkg = JSON.parse(await readFile(resolve(paths[index], 'package.json'), 'utf8'));
    if (pkg.name !== name) throw new Error(`La ruta indicada no corresponde a ${name}`);
    await readFile(resolve(paths[index], 'Dockerfile'));
    await readFile(resolve(paths[index], '.dockerignore'));
  }
  const template = await readFile(new URL('../.env.docker.example', import.meta.url), 'utf8');
  const content = template.replace('__BACKEND_DIR__', () => JSON.stringify(paths[0]))
    .replace('__PLAY_DIR__', () => JSON.stringify(paths[1]))
    .replaceAll('__RANDOM_HEX__', () => randomBytes(32).toString('hex'));
  await writeFile('.env.docker', content, { flag: 'wx', mode: 0o600 });
  console.log('.env.docker creado con secretos locales independientes. Credenciales del administrador en ese archivo; no compartirlo.');
} catch (error) {
  console.error(error.code === 'EEXIST' ? '.env.docker ya existe; no se sobrescribió ni rotó ningún secreto.' : error.message);
  process.exitCode = 1;
}
