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

test('CA-01/02/04/06: opt-in explícito y claves independientes sin exponer secretos', async t => {
  const { cwd, dirs, run } = await fixture(t);
  assert.equal(run(...dirs, '--synthetic-local').status, 1);
  const result = run(...dirs, '--synthetic-local', '--confirm-synthetic-data');
  assert.equal(result.status, 0, result.stderr);
  const content = await readFile(join(cwd, '.env.docker'), 'utf8');
  assert.match(content, /KUDLAB_LOCAL_SYNTHETIC_ENABLED=true/);
  assert.match(content, /GAME_ACCESS_ENABLED=true/);
  const secrets = content.match(/[a-f0-9]{64}/g);
  assert.equal(secrets.length, 8); assert.equal(new Set(secrets).size, 8);
  for (const value of secrets) assert(!`${result.stdout}${result.stderr}`.includes(value));
  const repeated = run('--extend-synthetic-local', '--confirm-synthetic-data');
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(await readFile(join(cwd, '.env.docker'), 'utf8'), content);
});

test('CA-05: ampliación confirmada solo añade faltantes y conserva configuración, permisos y secretos', async t => {
  const { cwd, dirs, run } = await fixture(t);
  assert.equal(run(...dirs).status, 0);
  const path = join(cwd, '.env.docker'), before = await readFile(path, 'utf8');
  assert.equal(run('--extend-synthetic-local').status, 1);
  assert.equal(await readFile(path, 'utf8'), before);
  const result = run('--extend-synthetic-local', '--confirm-synthetic-data');
  assert.equal(result.status, 0, result.stderr);
  const after = await readFile(path, 'utf8');
  assert(after.startsWith(before)); assert.match(after, /GAME_ACCESS_KEYS=/);
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  assert.equal(run('--extend-synthetic-local', '--confirm-synthetic-data').status, 0);
  assert.equal(await readFile(path, 'utf8'), after);
});

test('CA-06: rechaza claves reutilizadas o ajustes desactivados sin escritura parcial', async t => {
  const { cwd, dirs, run } = await fixture(t);
  assert.equal(run(...dirs).status, 0);
  const path = join(cwd, '.env.docker'), original = await readFile(path, 'utf8');
  for (const extra of ['GAME_ACCESS_ENABLED=false\n', `GAME_ACCESS_LOOKUP_KEY=${original.match(/GAME_CURSOR_KEY=(.*)/)[1]}\n`, 'GAME_ACCESS_KEYS=invalid-private-sentinel\n']) {
    const content = original + extra;
    await writeFile(path, content);
    const result = run('--extend-synthetic-local', '--confirm-synthetic-data');
    assert.equal(result.status, 1);
    assert(!result.stderr.includes('invalid-private-sentinel'));
    assert.equal(await readFile(path, 'utf8'), content);
  }
});
