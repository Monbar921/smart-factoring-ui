import { useAccessToken } from '@/auth/guest';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiJson } from './client';
import type {
  ClientCard,
  FunnelStage,
  ImportResult,
  LogEntry,
  Manager,
  Notification,
  Offer,
  Page,
  Run,
  RunDefaults,
  RunAttempt,
  RunListItem,
  RunUpd,
  UpdTrace,
} from './types';

const BASE = '/api/backend';
/** ЭП-2: статусы обновляются без перезагрузки не реже раза в 5 секунд */
const RUN_POLL_MS = 2000;

function useToken() {
  return useAccessToken();
}

function query(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

// ------------------------------------------------------------------ экран процесса

/** Параметры системы (Приложение А): пороги уровней риска для справки и т. п. Меняются редко - кеш на сессию */
export function useParameters() {
  const token = useToken();
  return useQuery({
    queryKey: ['parameters'],
    queryFn: () => apiJson<{ code: string; value: string }[]>(`${BASE}/parameters`, token!),
    enabled: Boolean(token),
    staleTime: Infinity,
  });
}

export function useRunDefaults() {
  const token = useToken();
  return useQuery({
    queryKey: ['runs', 'defaults'],
    queryFn: () => apiJson<RunDefaults>(`${BASE}/runs/defaults`, token!),
    enabled: Boolean(token),
    // пока идёт прогон - опрашиваем: иначе кнопка запуска остаётся «Прогон выполняется…» после его окончания
    refetchInterval: (q) => (q.state.data?.runningRunId != null ? RUN_POLL_MS : false),
  });
}

export function useRuns() {
  const token = useToken();
  return useQuery({
    queryKey: ['runs', 'list'],
    queryFn: () => apiJson<Page<RunListItem>>(`${BASE}/runs?size=50`, token!),
    enabled: Boolean(token),
    refetchInterval: (q) => (q.state.data?.items.some((run) => run.status === 'RUNNING') ? RUN_POLL_MS : false),
  });
}

/** Попытки запуска прогона, и отклонённые (П4-6) */
export function useRunAttempts() {
  const token = useToken();
  return useQuery({
    queryKey: ['runs', 'attempts'],
    queryFn: () => apiJson<Page<RunAttempt>>(`${BASE}/runs/attempts?size=20`, token!),
    enabled: Boolean(token),
  });
}

/** Прогон с шагами; пока выполняется - опрос раз в 2 с */
export function useRun(runId: number | null) {
  const token = useToken();
  return useQuery({
    queryKey: ['runs', runId],
    queryFn: () => apiJson<Run>(`${BASE}/runs/${runId}`, token!),
    enabled: Boolean(token) && runId !== null,
    refetchInterval: (q) => (q.state.data?.status === 'RUNNING' ? RUN_POLL_MS : false),
  });
}

export function useStartRun() {
  const token = useToken();
  const client = useQueryClient();
  return useMutation({
    // force - «Прогнать заново»: те же данные, что у прежнего прогона (П4-3)
    mutationFn: (request: { clientInns: string[] | null; calcDate: string | null; force?: boolean }) =>
      apiJson<{ runId: number }>(`${BASE}/runs`, token!, 'POST', request),
    onSettled: () => client.invalidateQueries({ queryKey: ['runs'] }),
  });
}

export function useFunnel(runId: number | null, enabled: boolean) {
  const token = useToken();
  return useQuery({
    queryKey: ['runs', runId, 'funnel'],
    queryFn: () => apiJson<FunnelStage[]>(`${BASE}/runs/${runId}/funnel`, token!),
    enabled: Boolean(token) && runId !== null && enabled,
  });
}

export interface UpdFilter {
  stage?: string;
  reason?: string;
  category?: string;
  clientId?: string;
  paymentStatus?: string;
  page: number;
}

export function useRunUpds(runId: number | null, filter: UpdFilter, enabled: boolean) {
  const token = useToken();
  return useQuery({
    queryKey: ['runs', runId, 'upds', filter],
    queryFn: () => apiJson<Page<RunUpd>>(`${BASE}/runs/${runId}/upds${query({ ...filter, size: 10 })}`, token!),
    enabled: Boolean(token) && runId !== null && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useUpdTrace(runId: number | null, updId: number | null) {
  const token = useToken();
  return useQuery({
    queryKey: ['runs', runId, 'trace', updId],
    queryFn: () => apiJson<UpdTrace>(`${BASE}/runs/${runId}/upds/${updId}/trace`, token!),
    enabled: Boolean(token) && runId !== null && updId !== null,
  });
}

/** Журнал прогона по страницам: в большом прогоне тысячи записей */
export const LOG_PAGE_SIZE = 300;

export function useRunLog(runId: number | null, level: string, isRunning: boolean, page = 0) {
  const token = useToken();
  return useQuery({
    queryKey: ['runs', runId, 'log', level, page],
    queryFn: () => apiJson<Page<LogEntry>>(`${BASE}/runs/${runId}/log${query({ level, page, size: LOG_PAGE_SIZE })}`, token!),
    enabled: Boolean(token) && runId !== null,
    refetchInterval: isRunning ? RUN_POLL_MS : false,
  });
}

export function useManualUpload() {
  const token = useToken();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (source: { path: string } | { file: File }) => {
      if ('path' in source) {
        return apiJson<ImportResult>(`${BASE}/manual-upload`, token!, 'POST', { path: source.path });
      }
      const form = new FormData();
      form.set('file', source.file);
      const response = await apiFetch(`${BASE}/manual-upload`, token!, { method: 'POST', body: form });
      return (await response.json()) as ImportResult;
    },
    onSuccess: () => client.invalidateQueries(),
  });
}

/** Полная очистка данных ручной загрузки и истории прогонов (импорт сам ничего не стирает) */
export function useResetManualUpload() {
  const token = useToken();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`${BASE}/manual-upload/data`, token!, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries(),
  });
}

// ------------------------------------------------------------------ эмулятор CRM

export function useManagers() {
  const token = useToken();
  return useQuery({
    queryKey: ['crm', 'managers'],
    queryFn: () => apiJson<Manager[]>(`${BASE}/managers`, token!),
    enabled: Boolean(token),
  });
}

export function useQueue(managerId: number | null) {
  const token = useToken();
  return useQuery({
    queryKey: ['crm', 'queue', managerId],
    queryFn: () => apiJson<Offer[]>(`${BASE}/managers/${managerId}/queue`, token!),
    enabled: Boolean(token) && managerId !== null,
  });
}

export function useNotifications(managerId: number | null) {
  const token = useToken();
  return useQuery({
    queryKey: ['crm', 'notifications', managerId],
    queryFn: () => apiJson<Page<Notification>>(`${BASE}/managers/${managerId}/notifications?size=200`, token!),
    enabled: Boolean(token) && managerId !== null,
  });
}

export function useClientCard(clientId: number | null) {
  const token = useToken();
  return useQuery({
    queryKey: ['crm', 'card', clientId],
    queryFn: () => apiJson<ClientCard>(`${BASE}/clients/${clientId}/card`, token!),
    enabled: Boolean(token) && clientId !== null,
  });
}

/** «Передать в факторинг» / «Отклонить» (блок 6) */
export function useOfferDecision() {
  const token = useToken();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, action, comment }: { offerId: number; action: 'transfer' | 'reject'; comment?: string }) =>
      apiJson<{ offer: Offer; packageId: number | null }>(
        `${BASE}/offers/${offerId}/${action}`,
        token!,
        'POST',
        action === 'reject' ? { comment: comment ?? null } : undefined,
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ['crm'] }),
  });
}
