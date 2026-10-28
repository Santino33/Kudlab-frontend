import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('../../scripts/setup-docker.mjs', import.meta.url));
async function fixture(t) {
  const cwd = await mkdtemp(join(process.env.TMPDIR ?? tmpdir(), 'kudlab-docker-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const dirs = ['backend with spaces', 'play'].map(name => join(cwd, name));
  for (const [i, name] of ['kudlab-backend', 'kudlab-play'].entries()) {
    await mkdir(dirs[i]);
    await writeFile(join(dirs[i], 'package.json'), JSON.stringify({ name }));
    await writeFile(join(dirs[i], 'Dockerfile'), 'FROM node:24-bookworm-slim\n');
    await writeFile(join(dirs[i], '.dockerignore'), '.env*\n');
  }
  return { cwd, dirs, run: (...args) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' }) };
}

test('crea configuración privada, rutas válidas y secretos independientes sin imprimirlos', async t => {
  const { cwd, dirs, run } = await fixture(t);
  const result = run(...dirs);
  assert.equal(result.status, 0, result.stderr);
  const content = await readFile(join(cwd, '.env.docker'), 'utf8');
  assert(content.includes(`KUDLAB_BACKEND_DIR=${JSON.stringify(dirs[0])}`));
  assert(!content.includes('__'));
  const secrets = content.match(/[a-f0-9]{64}/g);
  assert.equal(secrets.length, 5);
  assert.equal(new Set(secrets).size, 5);
  for (const value of secrets) assert(!`${result.stdout}${result.stderr}`.includes(value));
  assert.equal((await stat(join(cwd, '.env.docker'))).mode & 0o777, 0o600);
  assert.match(content, /MAIL_HOST=smtp\.invalid/);
});

test('rechaza sobrescribir una configuración existente sin rotar secretos', async t => {
  const { cwd, dirs, run } = await fixture(t);
  await writeFile(join(cwd, '.env.docker'), 'existing-local-settings', { mode: 0o600 });
  const result = run(...dirs);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no se sobrescribió/);
  assert.equal(await readFile(join(cwd, '.env.docker'), 'utf8'), 'existing-local-settings');
});

test('rechaza rutas de otro proyecto y no crea configuración parcial', async t => {
  const { cwd, dirs, run } = await fixture(t);
  const result = run(...dirs.toReversed());
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no corresponde a kudlab-backend/);
  await assert.rejects(readFile(join(cwd, '.env.docker')), { code: 'ENOENT' });
});

test('exige ambas rutas y archivos Docker antes de escribir', async t => {
  const { cwd, dirs, run } = await fixture(t);
  assert.equal(run(dirs[0]).status, 1);
  await rm(join(dirs[1], '.dockerignore'));
  assert.equal(run(...dirs).status, 1);
  await assert.rejects(readFile(join(cwd, '.env.docker')), { code: 'ENOENT' });
});
