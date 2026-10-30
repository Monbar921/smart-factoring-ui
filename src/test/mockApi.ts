/** Подмена fetch по маршрутам: «МЕТОД путь» → JSON-ответ; запросы складываются в calls */
export function mockApi(routes: Record<string, unknown | ((body: unknown) => unknown)>) {
  const calls: { method: string; url: string; body: unknown }[] = [];

  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, url, body });
    const path = url.split('?')[0];
    const handler = routes[`${method} ${path}`];
    if (handler === undefined) {
      return new Response(JSON.stringify({ code: 'NOT_FOUND', message: `нет мока ${method} ${path}` }), { status: 404 });
    }
    const value = typeof handler === 'function' ? (handler as (body: unknown) => unknown)(body) : handler;
    // ответ с ошибкой: { status: 409, body: { code, message, details } } через apiError()
    if (value instanceof MockError) {
      return new Response(JSON.stringify(value.body), { status: value.status, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });

  return calls;
}

class MockError {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {}
}

/** Ответ мока с кодом ошибки и телом ErrorDto */
export function apiError(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
  return new MockError(status, { code, message, details });
}
