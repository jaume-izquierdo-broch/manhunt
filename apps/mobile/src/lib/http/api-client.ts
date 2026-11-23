import { API_URL } from '../config';
import { ApiError } from './api-error';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  /** `false` for public routes (login, sign-up): no token is sent and a 401 doesn't sign the user out. */
  auth?: boolean;
  timeoutMs?: number;
}

interface AuthHooks {
  getToken: () => string | null;
  /** Called when an authenticated request gets a 401 (expired or revoked token). */
  onUnauthorized: () => void;
}

const DEFAULT_TIMEOUT_MS = 15_000;

let authHooks: AuthHooks = { getToken: () => null, onUnauthorized: () => {} };
let baseUrl = API_URL;

/** The session provider registers how to get the token and what to do on a 401. */
export function configureApiAuth(hooks: AuthHooks): void {
  authHooks = hooks;
}

/** Tests only. */
export function setApiBaseUrl(url: string): void {
  baseUrl = url;
}

export function getApiBaseUrl(): string {
  return baseUrl;
}

/**
 * A JSON request to the API. Returns the typed body or throws an `ApiError`
 * (never a raw network error), so screens only ever handle one error type.
 */
async function request<T>(
  method: Method,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = auth ? authHooks.getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw controller.signal.aborted ? ApiError.timeout() : ApiError.network();
  } finally {
    clearTimeout(timer);
  }

  const data = await readJson(response);
  if (response.ok) return data as T;

  if (response.status === 401 && token) authHooks.onUnauthorized();
  throw ApiError.fromBody(response.status, data);
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, options),
};
