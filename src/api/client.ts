/** Ответ gateway/backend с кодом не 2xx */
export class ApiError extends Error {
  readonly status: number;
  /** код ошибки backend (ErrorDto.code), если есть */
  readonly code?: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, message: string, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Запрос к API через gateway. Пути относительные (/api/...): UI и gateway на одном origin -
 * в dev проксирует Vite, в образе nginx. Gateway пускает только с access token пользователя.
 */
export async function apiFetch(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    throw await toError(response);
  }
  return response;
}

/** JSON-запрос к backend: тело - объект, ответ - JSON */
export async function apiJson<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await apiFetch(path, token, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Ошибка backend в формате ErrorDto ({code, message, details}) - с его сообщением, иначе - по статусу */
async function toError(response: Response): Promise<ApiError> {
  if (response.status !== 401 && response.status !== 403) {
    try {
      const body = (await response.json()) as { code?: string; message?: string; details?: Record<string, unknown> };
      if (body?.message) {
        return new ApiError(response.status, body.message, body.code, body.details);
      }
    } catch {
      // не JSON - сообщение по статусу
    }
  }
  return new ApiError(response.status, describeStatus(response.status));
}

export function describeStatus(status: number): string {
  if (status === 401) return 'Gateway не принял токен: войдите заново';
  if (status === 403) return 'Недостаточно прав';
  if (status === 404) return 'Метод не найден';
  if (status >= 500) return 'Сервис временно недоступен';
  return `Ошибка запроса (${status})`;
}
