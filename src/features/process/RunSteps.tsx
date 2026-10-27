import { Clock, Timer } from 'lucide-react';
import type { Run, RunStep } from '@/api/types';
import { RunStatusBadge, StepStatusBadge } from '@/components/StatusBadges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CATEGORIES, REASONS, date, dateTime, duration, label, minutesAsHours, money } from '@/lib/format';

type MetricKind = 'count' | 'money' | 'date' | 'fraction';

/** ЭП-3: какие числа показывать по каждому шагу и как их подписывать */
const STEP_METRICS: Record<number, [string, string, MetricKind][]> = {
  1: [
    ['clients', 'Клиентов', 'count'],
    ['newUpds', 'Новых УПД', 'count'],
    ['upds', 'УПД до даты расчёта', 'count'],
    ['payments', 'Платежей', 'count'],
    ['buyers', 'Покупателей', 'count'],
    ['buyersWithoutData', 'Покупателей без данных', 'count'],
    ['dataDate', 'Дата данных', 'date'],
  ],
  2: [
    ['paymentsAllocated', 'Распределено автоматически', 'count'],
    ['paymentsUnallocated', 'Нераспределённых платежей', 'count'],
    ['amountUnallocated', 'Нераспределено', 'money'],
    ['updsClosed', 'УПД закрыто', 'count'],
  ],
  3: [
    ['openUpds', 'Открытых УПД', 'count'],
    ['openAmount', 'Сумма открытых', 'money'],
    ['overdueNotifications', 'Уведомлений о просрочке', 'count'],
    ['riskSignals', 'Сигналов в риск', 'count'],
  ],
  4: [
    ['stopFactorBuyers', 'Покупателей под стоп-фактором', 'count'],
    ['noPaymentHistoryBuyers', 'Без истории оплат', 'count'],
    ['lowDataBuyers', 'С пометкой «мало данных»', 'count'],
    ['delayProbableUpds', 'УПД с вероятной задержкой', 'count'],
    ['scoringErrors', 'Ошибок оценки', 'count'],
    ['pdFromCache', 'PD из сохранённых', 'count'],
  ],
  5: [
    ['offers', 'УПД с предложением', 'count'],
    ['noOffers', 'Без предложения', 'count'],
    ['eadTotal', 'Сумма финансирования', 'money'],
    ['incomeTotal', 'Доход банка', 'money'],
    ['expectedAccepted', 'Ожидаемо принятых (Σ TR)', 'fraction'],
    ['newOfferNotifications', 'Уведомлений о новых', 'count'],
    ['revokedOffers', 'Отозвано', 'count'],
    ['withoutMessageDraft', 'Без черновика (сбой LLM)', 'count'],
  ],
};

function formatMetric(value: unknown, kind: MetricKind): string {
  if (value === null || value === undefined) return '—';
  if (kind === 'money') return money(Number(value));
  if (kind === 'date') return date(String(value));
  if (kind === 'fraction') return Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  return Number(value).toLocaleString('ru-RU');
}

/** ЭП-2, ЭП-3: ход прогона по шагам и ключевые числа результата шага */
export function RunSteps({ run }: { run: Run }) {
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex flex-wrap items-center gap-3 text-base">
          Прогон № {run.id}
          <RunStatusBadge status={run.status} />
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-x-4 gap-y-1">
          <span>Дата расчёта {date(run.calcDate)}</span>
          <span>Запуск {dateTime(run.startedAt)}</span>
          <span>Длительность {duration(run.durationMs)}</span>
          <span>{run.clientInns ? `Клиентов: ${run.clientInns.length}` : 'Все клиенты'}</span>
          <span>Снимок внешних данных {date(run.snapshotDate)}</span>
          {run.modelVersions && (
            <span>
              Модели:{' '}
              {Object.entries(run.modelVersions)
                .map(([name, version]) => `${name} ${version}`)
                .join(', ')}
            </span>
          )}
        </CardDescription>
        {run.errorMessage && <p className="text-sm text-destructive">{run.errorMessage}</p>}
      </CardHeader>
      <CardContent className="px-5">
        <ol className="grid gap-3 md:grid-cols-5">
          {run.steps.map((step) => (
            <StepCard key={step.stepNo} step={step} />
          ))}
        </ol>
        {run.comparison && <ManualComparison comparison={run.comparison} />}
      </CardContent>
    </Card>
  );
}

function StepCard({ step }: { step: RunStep }) {
  const metrics = step.metrics ?? {};
  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3" data-testid={`step-${step.stepNo}`}>
      <span className="text-xs text-muted-foreground">Шаг {step.stepNo}</span>
      <span className="text-sm leading-tight font-medium">{step.name}</span>
      <StepStatusBadge status={step.status} />
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="size-3" aria-hidden />
        {step.startedAt ? dateTime(step.startedAt) : '—'} · {duration(step.durationMs)}
      </span>
      {step.metrics && (
        <dl className="mt-1 flex flex-col gap-1 text-xs">
          {(STEP_METRICS[step.stepNo] ?? []).map(([key, title, kind]) => (
            <div key={key} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{title}</dt>
              <dd className="text-right font-medium tabular-nums">{formatMetric(metrics[key], kind)}</dd>
            </div>
          ))}
          <NestedMetric
            title="По категориям"
            value={metrics.byCategory}
            labelOf={(code) => `${code}: ${CATEGORIES[Number(code)] ?? ''}`}
          />
          <NestedMetric title="Уровни риска" value={metrics.buyersByRiskLevel} />
          <NestedMetric title="Причины отказа" value={metrics.noOfferByReason} labelOf={(code) => label(REASONS, code)} />
        </dl>
      )}
    </li>
  );
}

function NestedMetric({ title, value, labelOf }: { title: string; value: unknown; labelOf?: (code: string) => string }) {
  if (!value || typeof value !== 'object') return null;
  const entries = Object.entries(value as Record<string, number>);
  if (entries.length === 0) return null;
  return (
    <div className="mt-1 border-t pt-1">
      <dt className="mb-0.5 text-muted-foreground">{title}</dt>
      {entries.map(([code, count]) => (
        <dd key={code} className="flex justify-between gap-2">
          <span className="truncate" title={labelOf ? labelOf(code) : code}>
            {labelOf ? labelOf(code) : code}
          </span>
          <span className="font-medium tabular-nums">{count}</span>
        </dd>
      ))}
    </div>
  );
}

/** ЭП-9: время прогона и расчётное время ручной проработки тех же клиентов (допущение, Приложение А) */
function ManualComparison({ comparison }: { comparison: NonNullable<Run['comparison']> }) {
  return (
    <div className="mt-4 grid gap-3 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-3">
      <div>
        <div className="text-xs text-muted-foreground">Вручную: {comparison.clients} клиентов × 200 мин</div>
        <div className="text-lg font-semibold">{minutesAsHours(comparison.manualMinutes)}</div>
      </div>
      <div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Timer className="size-3" aria-hidden />
          Прогон системы
        </div>
        <div className="text-lg font-semibold">{duration(comparison.runDurationMs)}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Менеджеру остаётся (≈ 20 мин на клиента)</div>
        <div className="text-lg font-semibold">{minutesAsHours(comparison.systemMinutes)}</div>
      </div>
    </div>
  );
}
