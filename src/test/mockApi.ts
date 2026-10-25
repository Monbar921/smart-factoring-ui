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
    return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });

  return calls;
}
