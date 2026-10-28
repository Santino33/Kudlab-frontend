// Business errors only. Identity/AccessState remain owned by src/auth/state.ts.
export type UserField = 'name' | 'email' | 'role' | 'password';
export type UserError = {
  code: 'INVALID_INPUT' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' |
    'LAST_ADMIN' | 'VERIFICATION_EXPIRED' | 'UNAVAILABLE' | 'DELIVERY_FAILED' | 'DELIVERY_STATUS_UNKNOWN';
  message?: string;
  fields?: { field: UserField; reason: string }[];
};
export type ProviderError = { status: number; code?: string; message?: string };
export type HttpErrorCode = UserError['code'] | 'PARTICIPATION_BLOCKED';

export type HttpResult<T, Field extends string = UserField> =
  | { kind: 'success'; data: T }
  | { kind: 'error'; status: number; code?: HttpErrorCode; uncertain: boolean; fields?: { field: Field; reason: string }[] }
  | { kind: 'unavailable'; uncertain: boolean }
  | { kind: 'obsolete' };

export const accountStatuses = ['PENDIENTE', 'ACTIVA', 'INACTIVA'] as const;
export type AccountStatus = typeof accountStatuses[number];
export type Account = {
  id: string; name: string; email: string; role: 'ADMIN' | 'TEACHER'; status: AccountStatus; createdAt: string;
  pendingEmail?: string; deliveryStatus?: 'PENDIENTE' | 'ENVIADA' | 'ERROR'; invitationExpiresAt?: string;
};
export type AccountPage = { items: Account[]; total: number; limit: number; offset: number };
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const date = (v: unknown): v is string => text(v) && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));

export function parseAccount(value: unknown): Account | undefined {
  if (!object(value) || !text(value.id) || !text(value.name) || !text(value.email) || !date(value.createdAt) ||
    (value.role !== 'ADMIN' && value.role !== 'TEACHER') || !accountStatuses.includes(value.status as AccountStatus) ||
    (value.pendingEmail !== undefined && !text(value.pendingEmail)) ||
    (value.invitationExpiresAt !== undefined && !date(value.invitationExpiresAt)) ||
    (value.deliveryStatus !== undefined && !['PENDIENTE', 'ENVIADA', 'ERROR'].includes(String(value.deliveryStatus)))) return;
  return { id: value.id, name: value.name, email: value.email, role: value.role, status: value.status as AccountStatus,
    createdAt: value.createdAt, ...(value.pendingEmail ? { pendingEmail: value.pendingEmail as string } : {}),
    ...(value.deliveryStatus ? { deliveryStatus: value.deliveryStatus as Account['deliveryStatus'] } : {}),
    ...(value.invitationExpiresAt ? { invitationExpiresAt: value.invitationExpiresAt as string } : {}) };
}
export function parseAccountPage(value: unknown): AccountPage | undefined {
  if (!object(value) || !Array.isArray(value.items) || !Number.isInteger(value.total) || Number(value.total) < 0 ||
    !Number.isInteger(value.limit) || Number(value.limit) < 1 || Number(value.limit) > 100 ||
    !Number.isInteger(value.offset) || Number(value.offset) < 0 || value.items.length > Number(value.limit)) return;
  const items = value.items.map(parseAccount);
  if (items.some((item) => !item)) return;
  return { items: items as Account[], total: Number(value.total), limit: Number(value.limit), offset: Number(value.offset) };
}
export const validInstitutionalEmail = (value: string) => /^[^\s@]+@[^\s@]+\.edu\.co$/i.test(value.trim());
export const validNewPassword = (value: string) => value.length >= 8 && value.length <= 128 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value);
export function accountIssues(name: string, email: string): { name?: string; email?: string } {
  return { ...(!name.trim() || name.trim().length > 200 ? { name: 'Ingresa un nombre de entre 1 y 200 caracteres.' } : {}),
    ...(!validInstitutionalEmail(email) ? { email: 'Ingresa un correo institucional terminado en .edu.co.' } : {}) };
}
export function editFields(account: Account, name: string, email: string): { name?: string; email?: string } {
  const normalized = email.trim().toLowerCase();
  return { ...(name.trim() !== account.name ? { name: name.trim() } : {}),
    ...(normalized !== account.email ? { email: normalized } : {}) };
}
