import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

export function renderWithQuery(element: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

/** Подменяет fetch: на каждый вызов отдаёт следующий ответ, запросы складывает в calls */
export function mockFetch(...responses: { status?: number; body: string }[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  let index = 0;

  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const response = responses[Math.min(index++, responses.length - 1)]!;
    return new Response(response.body, { status: response.status ?? 200, headers: { 'Content-Type': 'text/plain' } });
  });

  return calls;
}
