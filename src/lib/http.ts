import type { AuthController } from '../auth/controller.ts';
import type { HttpResult, UserError, UserField } from '../features/usuarios/types.ts';

export function validateApiOrigin(value: string | undefined): string {
  if (!value) throw new Error('Configura el origen público de la API.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('El origen de la API no es válido.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
    url.pathname !== '/' || url.search || url.hash || ![url.origin, `${url.origin}/`].includes(value)) {
    throw new Error('La API requiere un origen HTTP(S) sin credenciales, ruta, query ni fragmento.');
  }
  return url.origin;
}

const errorCodes: UserError['code'][] = ['INVALID_INPUT', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND',
  'CONFLICT', 'LAST_ADMIN', 'VERIFICATION_EXPIRED', 'UNAVAILABLE', 'DELIVERY_FAILED', 'DELIVERY_STATUS_UNKNOWN'];
const fieldReasons: Record<UserField, string> = {
  name: 'Ingrese un nombre completo no vacío', email: 'Ingrese un correo institucional válido terminado en .edu.co',
  role: 'Seleccione el rol Docente', password: 'Use al menos 8 caracteres, una mayúscula, una minúscula y un número',
};

export function createHttpClient(origin: string, access: Pick<AuthController, 'getGeneration' | 'notify'>,
  fetcher: typeof fetch = globalThis.fetch, onUncertain: () => void = () => {}) {
  const base = validateApiOrigin(origin);
  return {
    async request<T, Field extends string = UserField>(path: string, options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'PUT'; body?: unknown; bodyAbsent?: boolean; signal: AbortSignal;
      decodeFields?(data: unknown): { field: Field; reason: string }[];
      decode(data: unknown, status: number): T | undefined;
    }): Promise<HttpResult<T, Field>> {
      const generation = access.getGeneration();
      const current = () => generation === access.getGeneration();
      const method = options.method ?? 'GET';
      const mutation = method !== 'GET';
      let url: URL;
      try { url = new URL(path, base); } catch { return { kind: 'unavailable', uncertain: false }; }
      if (!path.startsWith('/api/v1/') || url.origin !== base || url.hash ||
        url.pathname !== path.split('?')[0]) return { kind: 'unavailable', uncertain: false };
      try {
        const response = await fetcher(url.href, {
          method, credentials: 'include', cache: 'no-store', redirect: 'error', signal: options.signal,
          headers: { Accept: 'application/json', ...(mutation && !options.bodyAbsent ? { 'Content-Type': 'application/json' } : {}) },
          ...(mutation && !options.bodyAbsent ? { body: JSON.stringify(options.body ?? {}) } : {}),
        });
        if (response.redirected) throw new Error('Unexpected redirect');
        let data: unknown;
        try { data = await response.json(); } catch { /* A non-JSON error is still classified by HTTP status. */ }
        if (!current()) return { kind: 'obsolete' };
        if (options.signal.aborted) {
          if (mutation) onUncertain();
          return { kind: 'unavailable', uncertain: mutation };
        }
        if (response.ok) {
          const parsed = response.headers.get('content-type')?.toLowerCase().includes('application/json') ?
            options.decode(data, response.status) : undefined;
          if (parsed !== undefined) return { kind: 'success', data: parsed };
          if (mutation) onUncertain();
          access.notify({ generation, category: 'unavailable' });
          return { kind: 'unavailable', uncertain: mutation };
        }
        const category = response.status === 401 ? 'unauthenticated' : response.status === 403 ? 'forbidden' :
          response.status >= 500 ? 'unavailable' : undefined;
        const uncertain = mutation && (response.status === 401 || response.status === 403 || response.status >= 500 || response.status < 400);
        if (uncertain) onUncertain();
        if (category) access.notify({ generation, category });
        const code = typeof data === 'object' && data !== null && 'code' in data &&
          errorCodes.includes(data.code as UserError['code']) ? data.code as UserError['code'] : undefined;
        // Only documented, fixed field reasons may reach presentation, never arbitrary response text.
        const fields = typeof data === 'object' && data !== null && 'fields' in data && Array.isArray(data.fields) ?
          data.fields.flatMap((item): { field: UserField; reason: string }[] => {
            if (!item || typeof item !== 'object' || typeof item.field !== 'string' || !Object.hasOwn(fieldReasons, item.field) || item.reason !== fieldReasons[item.field as UserField]) return [];
            return [{ field: item.field as UserField, reason: fieldReasons[item.field as UserField] }];
          }) : [];
        const decodedFields = options.decodeFields ? options.decodeFields(data) : fields as { field: Field; reason: string }[];
        return { kind: 'error', status: response.status, ...(code ? { code } : {}),
          uncertain, ...(decodedFields.length ? { fields: decodedFields } : {}) };
      } catch {
        if (!current()) return { kind: 'obsolete' };
        if (mutation) onUncertain();
        if (!options.signal.aborted) access.notify({ generation, category: 'unavailable' });
        return { kind: 'unavailable', uncertain: mutation };
      }
    },
  };
}
export type HttpClient = ReturnType<typeof createHttpClient>;
