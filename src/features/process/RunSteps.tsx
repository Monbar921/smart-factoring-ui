import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, CircleX, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { RiskLevel, Run, RunStep, StepProgress, StepStatus } from '@/api/types';
import { RISK_SCALE } from '@/lib/risk';
import {
  CATEGORIES,
  REASONS,
  STEP_STATUSES,
  TEXT_SOURCES,
  approxDuration,
  date,
  duration,
  label,
  money,
  moneyShort,
  plural,
  progressEstimate,
  time,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import { Section } from './Section';

type Metrics = Record<string, unknown>;
type MetricKind = 'count' | 'money' | 'date' | 'fraction';

/** ЭП-3: все числа шага - в «подробнее» под строкой-итогом */
const STEP_METRICS: Record<number, [string, string, MetricKind][]> = {
  1: [
    ['clients', 'Клиентов', 'count'],
    ['newUpds', 'Новых УПД', 'count'],
    ['upds', 'УПД до даты расчёта', 'count'],
    ['payments', 'Платежей', 'count'],
    ['buyers', 'Покупателей', 'count'],
    ['buyersWithoutData', 'Покупателей без данных', 'count'],
    ['dataDate', 'Дата данных', 'date'],
    ['snapshotDate', 'Снимок внешних данных', 'date'],
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
    ['queuedOffers', 'В очередях менеджеров', 'count'],
    ['eadTotal', 'Сумма финансирования', 'money'],
    ['incomeTotal', 'Доход банка', 'money'],
    ['expectedAccepted', 'Ожидаемо согласятся (сумма шансов согласия)', 'fraction'],
    ['newOfferNotifications', 'Уведомлений о новых', 'count'],
    ['revokedOffers', 'Отозвано', 'count'],
    ['withoutMessageDraft', 'Без черновика (сбой LLM)', 'count'],
  ],
};

/** ЭП-2, ЭП-3: пять шагов прогона со статусом, временем и строкой-итогом, как на макете рис. 4 BRD */
export function RunSteps({ run }: { run: Run }) {
  return (
    <Section title="Ход прогона и результат шагов">
      {run.errorMessage && <p className="mb-2 text-sm text-destructive">{run.errorMessage}</p>}
      <ol className="flex flex-col gap-2.5">
        {run.steps.map((step) => (
          <StepItem key={step.stepNo} step={step} />
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground italic">
        Решения по предложениям менеджер принимает после прогона, в эмуляторе CRM
      </p>
    </Section>
  );
}

function StepItem({ step }: { step: RunStep }) {
  const metrics = step.metrics ?? {};
  const warnings = stepWarnings(step.stepNo, metrics);
  return (
    <li className="rounded-lg border bg-muted/40 px-4 py-3" data-testid={`step-${step.stepNo}`}>
      <div className="flex items-center gap-3">
        <StepIcon status={step.status} />
        <span className="font-semibold">
          {step.stepNo} {step.name}
        </span>
        <span className="sr-only">{label(STEP_STATUSES, step.status)}</span>
        <span
          className={cn('ml-auto text-sm font-semibold tabular-nums', step.status === 'DONE' && 'text-success')}
          title={step.startedAt ? `начало ${time(step.startedAt)}` : undefined}
        >
          {step.startedAt && <span className="mr-2 text-xs font-normal text-muted-foreground">{time(step.startedAt)}</span>}
          {step.status === 'PENDING' ? label(STEP_STATUSES, step.status) : duration(step.durationMs)}
        </span>
      </div>
      {step.status === 'RUNNING' && step.progress && <ProgressLine progress={step.progress} />}
      {step.metrics && (
        <>
          <p className="mt-1.5 text-sm">{stepSummary(step.stepNo, metrics).join(' · ')}</p>
          {warnings.length > 0 && <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{warnings.join(' · ')}</p>}
          <details className="mt-1 text-xs">
            <summary className="cursor-pointer text-muted-foreground">все числа шага</summary>
            <StepMetrics stepNo={step.stepNo} metrics={metrics} />
          </details>
        </>
      )}
    </li>
  );
}

/** Р-57: сколько из скольких сделано в долгой части шага, процент и сколько примерно осталось */
function ProgressLine({ progress }: { progress: StepProgress }) {
  const now = useNow(1000);
  const { percent, remainingMs } = progressEstimate(progress, now);
  return (
    <div className="mt-2" data-testid="step-progress">
      <div className="flex flex-wrap justify-between gap-x-3 text-sm">
        <span>
          {progress.label}: {progress.done.toLocaleString('ru-RU')} из {progress.total.toLocaleString('ru-RU')}
        </span>
        <span className="font-semibold tabular-nums">
          {percent} %{' · '}
          <span className="font-normal text-muted-foreground">
            {remainingMs === null ? 'оцениваем время' : `осталось ${approxDuration(remainingMs)}`}
          </span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={progress.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** Текущее время, обновляется раз в intervalMs: оставшееся время идёт и между опросами прогона */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function StepIcon({ status }: { status: StepStatus }) {
  const common = 'size-6 shrink-0';
  if (status === 'DONE') return <CheckCircle2 className={cn(common, 'text-success')} aria-hidden />;
  if (status === 'RUNNING') return <LoaderCircle className={cn(common, 'animate-spin text-primary')} aria-hidden />;
  if (status === 'WARNING') return <TriangleAlert className={cn(common, 'text-amber-600')} aria-hidden />;
  if (status === 'STOPPED') return <CircleX className={cn(common, 'text-destructive')} aria-hidden />;
  return <Circle className={cn(common, 'text-muted-foreground')} aria-hidden />;
}

const num = (value: unknown) => Number(value ?? 0);
const entries = (value: unknown) => Object.entries((value ?? {}) as Record<string, number>);

/** Строка-итог шага (ЭП-3), формулировки - как на макете */
function stepSummary(stepNo: number, m: Metrics): string[] {
  switch (stepNo) {
    case 1:
      return [
        plural(num(m.clients), ['клиент', 'клиента', 'клиентов']),
        `${plural(num(m.newUpds), ['новый УПД', 'новых УПД', 'новых УПД'])}`,
        plural(num(m.payments), ['платёж', 'платежа', 'платежей']),
        `${plural(num(m.buyers), ['покупатель', 'покупателя', 'покупателей'])} (без данных: ${num(m.buyersWithoutData)})`,
        `данные на ${date(String(m.dataDate ?? ''))}`,
      ];
    case 2: {
      const allocated = num(m.paymentsAllocated);
      const total = allocated + num(m.paymentsUnallocated);
      return [
        `распределено ${allocated} из ${plural(total, ['платежа', 'платежей', 'платежей'])}`,
        `нераспределено ${num(m.paymentsUnallocated)}${num(m.amountUnallocated) ? ` (${money(num(m.amountUnallocated))})` : ''}`,
        `закрыто УПД: ${num(m.updsClosed)}`,
      ];
    }
    case 3: {
      const byCategory = entries(m.byCategory);
      const sum = (from: number, to: number) =>
        byCategory.filter(([code]) => Number(code) >= from && Number(code) <= to).reduce((total, [, count]) => total + count, 0);
      return [
        `открытых УПД ${num(m.openUpds)}`,
        `категории 1–4: ${sum(1, 4)}`,
        `категории 5–8: ${sum(5, 8)}`,
        `уведомлений о просрочке ${num(m.overdueNotifications)}`,
        `сигналов в риск ${num(m.riskSignals)}`,
      ];
    }
    case 4: {
      const levels = (m.buyersByRiskLevel ?? {}) as Record<string, number>;
      return [
        `стоп-факторы: ${plural(num(m.stopFactorBuyers), ['покупатель', 'покупателя', 'покупателей'])}`,
        `без истории оплат: ${num(m.noPaymentHistoryBuyers)}`,
        `«мало данных»: ${num(m.lowDataBuyers)}`,
        `уровни: ${(['A', 'B', 'C', 'D'] as const).map((level) => `${level} ${RISK_SCALE[level].word} ${levels[level] ?? 0}`).join(' · ')}`,
        `вероятная задержка: ${num(m.delayProbableUpds)} УПД`,
      ];
    }
    case 5:
      return [
        `с предложением ${num(m.offers)}, без предложения ${num(m.noOffers)}`,
        `в очереди ${num(m.queuedOffers)}`,
        `сумма ${moneyShort(num(m.eadTotal))}`,
        `доход банка ${moneyShort(num(m.incomeTotal))}`,
        `уведомлений ${num(m.newOfferNotifications)}`,
        ...textsSummary(m.textsBySource),
      ];
    default:
      return [];
  }
}

/** Р-58: откуда тексты карточек - видно сразу, без раскрытия «все числа шага» */
function textsSummary(value: unknown): string[] {
  const items = entries(value).filter(([, count]) => count > 0);
  if (items.length === 0) return [];
  return [`тексты: ${items.map(([code, count]) => `${label(TEXT_SOURCES, code)} ${count}`).join(', ')}`];
}

/** Технические сбои шага - отдельной строкой, чтобы их не пропустить (статус «предупреждение», ПР-6) */
function stepWarnings(stepNo: number, m: Metrics): string[] {
  if (stepNo === 4 && num(m.scoringErrors) > 0) return [`ошибок оценки: ${num(m.scoringErrors)}`];
  if (stepNo === 5 && num(m.withoutMessageDraft) > 0) return [`без черновика (сбой LLM): ${num(m.withoutMessageDraft)}`];
  return [];
}

function StepMetrics({ stepNo, metrics }: { stepNo: number; metrics: Metrics }) {
  return (
    <dl className="mt-1 flex flex-col gap-0.5">
      {(STEP_METRICS[stepNo] ?? []).map(([key, title, kind]) => (
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
      <NestedMetric
        title="Уровни риска покупателей"
        value={metrics.buyersByRiskLevel}
        labelOf={(code) => `${code} — ${RISK_SCALE[code as RiskLevel]?.title ?? code}`}
      />
      <NestedMetric title="Причины отказа" value={metrics.noOfferByReason} labelOf={(code) => label(REASONS, code)} />
      <NestedMetric title="Тексты карточек" value={metrics.textsBySource} labelOf={(code) => label(TEXT_SOURCES, code)} />
    </dl>
  );
}

function formatMetric(value: unknown, kind: MetricKind): string {
  if (value === null || value === undefined) return '—';
  if (kind === 'money') return money(Number(value));
  if (kind === 'date') return date(String(value));
  if (kind === 'fraction') return Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  return Number(value).toLocaleString('ru-RU');
}

function NestedMetric({ title, value, labelOf }: { title: string; value: unknown; labelOf?: (code: string) => string }) {
  const items = entries(value);
  if (items.length === 0) return null;
  return (
    <div className="mt-1 border-t pt-1">
      <dt className="mb-0.5 text-muted-foreground">{title}</dt>
      {items.map(([code, count]) => (
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
