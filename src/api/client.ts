/** Ответ gateway/backend с кодом не 2xx */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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
    throw new ApiError(response.status, describeStatus(response.status));
  }
  return response;
}

export function describeStatus(status: number): string {
  if (status === 401) return 'Gateway не принял токен: войдите заново';
  if (status === 403) return 'Недостаточно прав';
  if (status === 404) return 'Метод не найден';
  if (status >= 500) return 'Сервис временно недоступен';
  return `Ошибка запроса (${status})`;
}
