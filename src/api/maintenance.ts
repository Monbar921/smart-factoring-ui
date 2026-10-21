import { useQuery } from '@tanstack/react-query';
import { useAuth } from 'react-oidc-context';
import { apiFetch } from './client';

export interface HelloResult {
  message: string;
  /** время ответа с учётом gateway, мс */
  latencyMs: number;
  receivedAt: Date;
}

export async function getHello(token: string): Promise<HelloResult> {
  const startedAt = performance.now();
  const response = await apiFetch('/api/backend/maintenance/hello', token);
  const message = await response.text();
  return { message, latencyMs: Math.round(performance.now() - startedAt), receivedAt: new Date() };
}

/** Проверка связи UI -> gateway -> backend */
export function useHello() {
  const token = useAuth().user?.access_token;
  return useQuery({
    queryKey: ['maintenance', 'hello'],
    queryFn: () => getHello(token!),
    enabled: Boolean(token),
  });
}
