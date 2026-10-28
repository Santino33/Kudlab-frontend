import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPreviewOrigins } from '../browser/preview-origins.mjs';

const config = { teacherOrigin: 'http://localhost:5185', apiOrigin: 'http://localhost:4315', playOrigin: 'http://127.0.0.1:4185' };
test('accepts one coherent preview stack', () => {
  assert.doesNotThrow(() => assertPreviewOrigins([config.apiOrigin, config.playOrigin], [config.apiOrigin, config.teacherOrigin], config));
});
test('rejects the reported preview mismatch before generating or playing', () => {
  assert.throws(() => assertPreviewOrigins([config.apiOrigin, 'http://127.0.0.1:4184'], ['http://localhost:4314', 'http://localhost:5184'], config), /PREVIEW_ORIGINS_MISMATCH/);
});
test('rejects independently mismatched API, teacher origin or Play link', () => {
  for (const [teacher, play] of [
    [[config.apiOrigin, config.playOrigin], ['http://localhost:4314', config.teacherOrigin]],
    [[config.apiOrigin, config.playOrigin], [config.apiOrigin, 'http://localhost:5184']],
    [[config.apiOrigin, 'http://127.0.0.1:4184'], [config.apiOrigin, config.teacherOrigin]],
  ]) assert.throws(() => assertPreviewOrigins(teacher, play, config), /PREVIEW_ORIGINS_MISMATCH/);
});
