import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { type UpdFilter, useRunUpds, useUpdTrace } from '@/api/backend';
import type { RunUpd } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CATEGORIES,
  LOG_EVENTS,
  PAYMENT_STATUSES,
  REASONS,
  dateTime,
  label,
  lowerFirst,
  moneyShort,
  percent,
  updLabel,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import { Section } from './Section';

const SELECT = 'h-8 rounded-md border bg-background px-2 text-xs';

/** ЭП-5: список УПД за числом на экране (колонки - как на макете рис. 4 BRD) и путь УПД через шаги */
export function UpdTable({
  runId,
  enabled,
  filter,
  onFilter,
}: {
  runId: number;
  enabled: boolean;
  filter: UpdFilter;
  onFilter: (filter: UpdFilter) => void;
}) {
  const upds = useRunUpds(runId, filter, enabled);
  const [traceId, setTraceId] = useState<number | null>(null);
  const pages = upds.data ? Math.max(1, Math.ceil(upds.data.total / upds.data.size)) : 1;

  return (
    <Section title="Детализация по УПД" requirement="ЭП-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <select
          className={SELECT}
          aria-label="Решение"
          value={filter.reason ?? ''}
          onChange={(event) => onFilter({ ...filter, reason: event.target.value || undefined, page: 0 })}
        >
          <option value="">Все причины</option>
          {Object.entries(REASONS).map(([code, title]) => (
            <option key={code} value={code}>
              {title}
            </option>
          ))}
        </select>
        <select
          className={SELECT}
          aria-label="Категория"
          value={filter.category ?? ''}
          onChange={(event) => onFilter({ ...filter, category: event.target.value || undefined, page: 0 })}
        >
          <option value="">Все категории</option>
          {Object.entries(CATEGORIES).map(([code, title]) => (
            <option key={code} value={code}>
              {code}. {title}
            </option>
          ))}
        </select>
        <select
          className={SELECT}
          aria-label="Оплата"
          value={filter.paymentStatus ?? ''}
          onChange={(event) => onFilter({ ...filter, paymentStatus: event.target.value || undefined, page: 0 })}
        >
          <option value="">Любая оплата</option>
          {Object.entries(PAYMENT_STATUSES).map(([code, title]) => (
            <option key={code} value={code}>
              {title}
            </option>
          ))}
        </select>
        {filter.stage && (
          <Badge variant="outline" className="gap-1">
            ступень {filter.stage}
            <button
              type="button"
              aria-label="Сбросить ступень"
              onClick={() => onFilter({ ...filter, stage: undefined, page: 0 })}
            >
              <X className="size-3" />
            </button>
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{upds.data ? `Найдено: ${upds.data.total}` : ''}</span>
      </div>

      <Table>
        <TableHeader className="bg-primary/10">
          <TableRow>
            <TableHead>УПД</TableHead>
            <TableHead>Клиент</TableHead>
            <TableHead>Покупатель</TableHead>
            <TableHead>Кат.</TableHead>
            <TableHead>PD · уровень</TableHead>
            <TableHead>P(задержка)</TableHead>
            <TableHead>Решение и причина</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {upds.data?.items.map((upd) => (
            <TableRow
              key={upd.updId}
              className={cn('cursor-pointer', traceId === upd.updId && 'bg-muted')}
              onClick={() => setTraceId(upd.updId)}
            >
              <TableCell className="font-medium whitespace-nowrap">{upd.number}</TableCell>
              <TableCell className="max-w-36 truncate" title={upd.client.name ?? undefined}>
                {upd.client.name}
              </TableCell>
              <TableCell className="max-w-36 truncate" title={`${upd.buyer.name ?? ''} ${upd.buyer.inn}`.trim()}>
                {upd.buyer.name ?? <span className="font-mono">{upd.buyer.inn}</span>}
              </TableCell>
              <TableCell>{upd.category ?? '—'}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{pdAndLevel(upd)}</TableCell>
              <TableCell className="tabular-nums">{upd.reason === 'STOP_FACTOR' ? '—' : percent(upd.pDelay)}</TableCell>
              <TableCell className="min-w-44 whitespace-normal">{decision(upd)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="text-muted-foreground italic">По клику на УПД открывается его путь через шаги прогона</span>
        <Button
          className="ml-auto"
          variant="outline"
          size="sm"
          disabled={filter.page === 0}
          onClick={() => onFilter({ ...filter, page: filter.page - 1 })}
          aria-label="Предыдущая страница"
        >
          <ChevronLeft aria-hidden />
        </Button>
        <span>
          {filter.page + 1} / {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={filter.page + 1 >= pages}
          onClick={() => onFilter({ ...filter, page: filter.page + 1 })}
          aria-label="Следующая страница"
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
      {traceId !== null && <UpdTrace runId={runId} updId={traceId} onClose={() => setTraceId(null)} />}
    </Section>
  );
}

function pdAndLevel(upd: RunUpd): string {
  if (upd.reason === 'STOP_FACTOR') return 'стоп-фактор';
  if (upd.pd === null) return '—';
  return upd.riskLevel ? `${percent(upd.pd)} · ${upd.riskLevel}` : percent(upd.pd);
}

/** «Решение и причина» одной фразой, как на макете */
function decision(upd: RunUpd): string {
  if (upd.decision === 'OFFER') {
    return `Предложение: ${moneyShort(upd.eadFinal)}${upd.paymentStatus === 'PARTIAL' ? ' на остаток после частичной оплаты' : ''}`;
  }
  if (upd.reason) {
    return `Нет предложения: ${lowerFirst(label(REASONS, upd.reason))}`;
  }
  return upd.paymentStatus === 'PAID' ? 'Оплачен' : '—';
}

function UpdTrace({ runId, updId, onClose }: { runId: number; updId: number; onClose: () => void }) {
  const trace = useUpdTrace(runId, updId);
  return (
    <section className="mt-4 rounded-lg border bg-muted/30 p-4" aria-label="Путь УПД">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">
          Путь {updLabel(trace.data?.upd.number)} · {trace.data?.upd.client.name} →{' '}
          {trace.data?.upd.buyer.name ?? trace.data?.upd.buyer.inn}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Закрыть путь УПД">
          <X aria-hidden />
        </Button>
      </div>
      <ol className="flex flex-col gap-2">
        {trace.data?.steps.map((step) => (
          <li key={step.stepNo} className="rounded-md bg-background p-3 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground">Шаг {step.stepNo}.</span>
              <span className="font-medium">{step.name}</span>
            </div>
            <p className="mt-1">{step.summary}</p>
            <details className="mt-1 text-xs text-muted-foreground">
              <summary className="cursor-pointer">подробности</summary>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(step.details, null, 2)}</pre>
            </details>
          </li>
        ))}
      </ol>
      {trace.data && trace.data.log.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-xs">
          {trace.data.log.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                entry.level === 'ERROR' && 'text-destructive',
                entry.level === 'WARN' && 'text-amber-700 dark:text-amber-400',
              )}
            >
              {dateTime(entry.loggedAt)} · <span title={entry.eventCode}>{label(LOG_EVENTS, entry.eventCode)}</span> ·{' '}
              {entry.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
