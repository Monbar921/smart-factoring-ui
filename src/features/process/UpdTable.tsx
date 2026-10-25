import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { type UpdFilter, useRunUpds, useUpdTrace } from '@/api/backend';
import { RiskBadge } from '@/components/StatusBadges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CATEGORIES, PAYMENT_STATUSES, REASONS, date, dateTime, label, money, percent } from '@/lib/format';
import { cn } from '@/lib/utils';

const SELECT = 'h-8 rounded-md border bg-background px-2 text-xs';

/** ЭП-5: список УПД за числом на экране и путь УПД через шаги */
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
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">УПД прогона</CardTitle>
        <CardDescription>Нажмите на строку - путь УПД по шагам прогона</CardDescription>
        <div className="mt-2 flex flex-wrap items-center gap-2">
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
      </CardHeader>
      <CardContent className="px-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>УПД</TableHead>
              <TableHead>Клиент</TableHead>
              <TableHead>Покупатель</TableHead>
              <TableHead className="text-right">Остаток</TableHead>
              <TableHead>Кат.</TableHead>
              <TableHead className="text-right">PD</TableHead>
              <TableHead>Риск</TableHead>
              <TableHead className="text-right">P задержки</TableHead>
              <TableHead>Решение</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {upds.data?.items.map((upd) => (
              <TableRow key={upd.updId} className="cursor-pointer" onClick={() => setTraceId(upd.updId)}>
                <TableCell className="whitespace-nowrap">
                  <div className="font-medium">{upd.number}</div>
                  <div className="text-xs text-muted-foreground">{date(upd.updDate)}</div>
                </TableCell>
                <TableCell className="max-w-40 truncate">{upd.client.name}</TableCell>
                <TableCell className="max-w-40 truncate">
                  {upd.buyer.name ?? <span className="font-mono">{upd.buyer.inn}</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(upd.outstanding)}</TableCell>
                <TableCell>{upd.category ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{percent(upd.pd)}</TableCell>
                <TableCell>
                  <RiskBadge level={upd.riskLevel} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{percent(upd.pDelay)}</TableCell>
                <TableCell>
                  {upd.decision === 'OFFER' ? (
                    <Badge className="bg-success/15 text-success">Предложение</Badge>
                  ) : upd.paymentStatus === 'PAID' ? (
                    <span className="text-xs text-muted-foreground">Оплачен</span>
                  ) : (
                    <span className="text-xs">{label(REASONS, upd.reason)}</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(upd.eadFinal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-3 flex items-center justify-end gap-2 text-xs">
          <Button
            variant="outline"
            size="sm"
            disabled={filter.page === 0}
            onClick={() => onFilter({ ...filter, page: filter.page - 1 })}
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
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
        {traceId !== null && <UpdTrace runId={runId} updId={traceId} onClose={() => setTraceId(null)} />}
      </CardContent>
    </Card>
  );
}

function UpdTrace({ runId, updId, onClose }: { runId: number; updId: number; onClose: () => void }) {
  const trace = useUpdTrace(runId, updId);
  return (
    <section className="mt-4 rounded-lg border bg-muted/30 p-4" aria-label="Путь УПД">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">
          Путь УПД {trace.data?.upd.number} · {trace.data?.upd.client.name} →{' '}
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
            <li key={entry.id} className={cn(entry.level === 'ERROR' && 'text-destructive')}>
              {dateTime(entry.loggedAt)} · {entry.eventCode} · {entry.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
