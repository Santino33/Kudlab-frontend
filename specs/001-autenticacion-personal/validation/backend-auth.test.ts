// Harness diagnóstico: copiar a tests/integration/frontend-auth-validation.test.ts
// en un worktree backend aislado. No ejecutar como test de la aplicación frontend.
// Requiere exclusivamente la base desechable descrita en ../backend-validation.md.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { auth } from '../../src/auth/auth.js';
import { db } from '../../src/db/client.js';
import { session } from '../../src/db/schema/auth.js';
import { reset } from '../helpers.js';

const origin = 'http://localhost:3000';
const request = (path: string, method = 'GET', cookie?: string, body?: unknown) =>
  app.request(path, { method, headers: { origin, ...(cookie ? { cookie } : {}),
    ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

async function cookieLogin() {
  const response = await request('/api/auth/sign-in/email', 'POST', undefined,
    { email: 'admin@pilot.edu.co', password: 'TestingA123' });
  expect(response.status).toBe(200);
  const sessionCookie = response.headers.getSetCookie()
    .find((value) => value.startsWith('better-auth.session_token='));
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie).toMatch(/HttpOnly/i);
  expect(sessionCookie).toMatch(/SameSite=Lax/i);
  expect(sessionCookie).toMatch(/Max-Age=1800/i);
  return sessionCookie!.split(';')[0]!;
}

describe('diagnóstico frontend: cookie y garantías backend', () => {
  beforeEach(reset);
  afterEach(() => vi.restoreAllMocks());

  it('cierre normal invalida la credencial cookie original', async () => {
    const cookie = await cookieLogin();
    const response = await request('/api/auth/sign-out', 'POST', cookie);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect((await request('/api/auth/get-session', 'GET', cookie)).status).toBe(401);
  });

  it('REPRODUCE P-01: fallo de borrado devuelve éxito y la credencial sigue válida', async () => {
    const cookie = await cookieLogin();
    const context = await auth.$context;
    const deletion = vi.spyOn(context.internalAdapter, 'deleteSession')
      .mockRejectedValueOnce(new Error('SYNTHETIC_DELETE_FAILURE'));
    const response = await request('/api/auth/sign-out', 'POST', cookie);
    expect(deletion).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(response.headers.getSetCookie().some((value) =>
      value.startsWith('better-auth.session_token=;') && /Max-Age=0/i.test(value))).toBe(true);
    deletion.mockRestore();
    expect((await request('/api/auth/get-session', 'GET', cookie)).status).toBe(200);
    expect((await request('/api/v1/accounts', 'GET', cookie)).status).toBe(200);
  });

  it('REPRODUCE P-02: get-session renueva registro sin transmitir cookie renovada', async () => {
    const cookie = await cookieLogin();
    const initial = await (await request('/api/auth/get-session', 'GET', cookie)).json();
    const earlierExpiry = new Date(Date.now() + 1_200_000);
    await db.update(session).set({ expiresAt: earlierExpiry,
      updatedAt: new Date(Date.now() - 600_000) }).where(eq(session.id, initial.session.id));
    const response = await request('/api/auth/get-session', 'GET', cookie);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(new Date(body.session.expiresAt).getTime()).toBeGreaterThan(earlierExpiry.getTime() + 500_000);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(body.session).not.toHaveProperty('lastAcceptedAt');
  });

  it('REPRODUCE P-02: operación protegida tampoco transmite renovación', async () => {
    const cookie = await cookieLogin();
    const initial = await (await request('/api/auth/get-session', 'GET', cookie)).json();
    const earlierExpiry = new Date(Date.now() + 1_200_000);
    await db.update(session).set({ expiresAt: earlierExpiry,
      updatedAt: new Date(Date.now() - 600_000) }).where(eq(session.id, initial.session.id));
    const response = await request('/api/v1/accounts', 'GET', cookie);
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([]);
    const [persisted] = await db.select().from(session).where(eq(session.id, initial.session.id));
    expect(persisted!.expiresAt.getTime()).toBeGreaterThan(earlierExpiry.getTime() + 500_000);
  });
});
