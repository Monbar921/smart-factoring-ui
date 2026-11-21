import { useMonitoring, useRuns } from '@/api/backend';
import type { Bucket, Monitoring, Psi } from '@/api/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Section } from '@/features/process/Section';
import { TEXT_SOURCES, date, label, pdPercent, percent, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { openMonitoring } from '@/lib/useHashRoute';

const PSI_STATUS: Record<Psi['status'], { title: string; className: string }> = {
  STABLE: { title: 'стабильно', className: 'bg-success/15 text-success' },
  WATCH: { title: 'наблюдать', className: 'bg-amber-500/20 text-amber-800 dark:text-amber-300' },
  SHIFT: { title: 'сдвиг — перепроверить модель', className: 'bg-destructive/15 text-destructive' },
};

const PD_SOURCES: Record<string, string> = { MODEL: 'модель', BASE: 'базовый PD «мало данных»' };
const DELAY_STATUSES: Record<string, string> = {
  SCORED: 'оценено',
  NO_PAYMENT_HISTORY: 'нет истории оплат',
  ERROR: 'ошибка оценки',
};

/** доля отклонённых ответов LLM, выше которой стоит смотреть промпты или модель */
const LLM_REJECTED_WATCH = 0.1;
const PSI_RELIABLE_N = 100;

/**
 * Мониторинг моделей и LLM по запуску (дорожная карта п. 1.3-12, Р-87): версии, распределение оценок PD и задержки,
 * PSI к выборке разработки модели и к прошлому запуску, доля ответов LLM, отклонённых проверкой фактов. По умолчанию -
 * последний завершённый запуск.
 */
export function MonitoringPage({ runId: requested = null }: { runId?: number | null }) {
  const runs = useRuns();
  const finished = runs.data?.items.filter((run) => run.status === 'DONE' || run.status === 'DONE_WITH_WARNINGS') ?? [];
  const runId = requested ?? finished[0]?.id ?? null;
  const monitoring = useMonitoring(runId);
  const data = monitoring.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Запуск
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={runId ?? ''}
            onChange={(event) => openMonitoring(Number(event.target.value))}
          >
            {finished.map((run) => (
              <option key={run.id} value={run.id}>
                № {run.id} от {date(run.calcDate)}
              </option>
            ))}
          </select>
        </label>
        {runId !== null && (
          <a className="text-sm text-primary underline-offset-4 hover:underline" href={`#/process/${runId}`}>
            Открыть запуск на экране процесса
          </a>
        )}
      </div>

      {runs.isSuccess && runId === null && (
        <p className="text-muted-foreground">Нет завершённых запусков: запустите анализ дебиторки.</p>
      )}
      {monitoring.isError && <p className="text-destructive">Мониторинг не получен: {String(monitoring.error.message)}</p>}
      {runId !== null && monitoring.isPending && <Skeleton className="h-64 w-full" />}
      {data && <MonitoringView data={data} />}
    </div>
  );
}

function MonitoringView({ data }: { data: Monitoring }) {
  const { pd, delay, llm } = data;
  return (
    <>
      <Section title="Версии">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Модель PD покупателя</dt>
          <dd className="font-medium">{data.models.pd ?? '—'}</dd>
          <dt className="text-muted-foreground">Модель задержки оплаты</dt>
          <dd className="font-medium">{data.models.delay ?? '—'}</dd>
          <dt className="text-muted-foreground">Тексты карточек (LLM)</dt>
          <dd className="font-medium">{data.models.llm ?? '—'}</dd>
          {pd.reference && (
            <>
              <dt className="text-muted-foreground">Эталон для PSI</dt>
              <dd>
                {pd.reference.sample}
                {pd.reference.size ? `, ${pd.reference.size.toLocaleString('ru-RU')} компаний` : ''}
              </dd>
            </>
          )}
        </dl>
      </Section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-3">
        <Section title="PD покупателей">
          <p className="mb-2 text-sm text-muted-foreground">
            {plural(pd.buyers, ['покупатель', 'покупателя', 'покупателей'])}, средний PD {pdPercent(pd.meanPd)}
            {Object.entries(pd.bySource).map(([source, count]) => ` · ${label(PD_SOURCES, source)}: ${count}`)}
            {pd.stopFactors > 0 ? ` · стоп-фактор: ${pd.stopFactors}` : ''}
            {pd.fromCache > 0 ? ` · из кэша: ${pd.fromCache}` : ''}
          </p>
          <Bars title="Уровни риска" buckets={pd.levels} reference={pd.reference?.shares} />
          <PsiLine title="PSI к выборке разработки" psi={pd.psiReference} missing="у модели нет эталона (заглушка)" />
          <PsiLine title="PSI к прошлому запуску" psi={pd.psiPrevious} missing="первый запуск на этой версии модели" />
        </Section>

        <Section title="Задержка оплаты">
          <p className="mb-2 text-sm text-muted-foreground">
            {plural(delay.upds, ['УПД', 'УПД', 'УПД'])}
            {delay.thresholdDays !== null ? `, порог ${delay.thresholdDays} дн.` : ''}, средняя вероятность{' '}
            {percent(delay.meanPDelay)}
            {Object.entries(delay.byStatus).map(([status, count]) => ` · ${label(DELAY_STATUSES, status)}: ${count}`)}
          </p>
          <Bars title="Вероятность задержки больше порога" buckets={delay.buckets} />
          <PsiLine title="PSI к прошлому запуску" psi={delay.psiPrevious} missing="первый запуск на этой версии модели" />
        </Section>

        <Section title="Тексты LLM">
          <p className="mb-2 text-sm text-muted-foreground">
            {plural(llm.cards, ['карточка', 'карточки', 'карточек'])}
            {Object.entries(llm.bySource).map(([source, count]) => ` · ${label(TEXT_SOURCES, source)}: ${count}`)}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-2xl font-semibold tabular-nums',
                llm.rejectedShare !== null && llm.rejectedShare >= LLM_REJECTED_WATCH && 'text-destructive',
              )}
            >
              {llm.rejectedShare !== null ? percent(llm.rejectedShare) : '—'}
            </span>
            <span className="text-sm text-muted-foreground">ответов отклонено проверкой фактов</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {llm.answers > 0
              ? `${llm.rejected} из ${llm.answers} ответов; в шаблон после двух отказов — ${llm.templateAfterFactCheck}`
              : 'В этом запуске LLM не вызывалась: заглушка, кеш или LLM выключена'}
          </p>
        </Section>
      </div>

      {data.history.length > 1 && (
        <Section title="Тренд по запускам">
          <Table>
            <TableHeader className="bg-primary/10">
              <TableRow>
                <TableHead>Запуск</TableHead>
                <TableHead>Дата расчёта</TableHead>
                <TableHead>Модель PD</TableHead>
                <TableHead className="text-right">Покупателей</TableHead>
                <TableHead className="text-right">PSI к эталону</TableHead>
                <TableHead className="text-right">PSI к прошлому</TableHead>
                <TableHead className="text-right">Отклонено LLM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.history.map((point) => (
                <TableRow
                  key={point.runId}
                  className={cn('cursor-pointer', point.runId === data.runId && 'bg-muted/50')}
                  onClick={() => openMonitoring(point.runId)}
                >
                  <TableCell className="font-medium">№ {point.runId}</TableCell>
                  <TableCell>{date(point.calcDate)}</TableCell>
                  <TableCell>{point.pdVersion ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{point.buyers}</TableCell>
                  <TableCell className="text-right tabular-nums">{psiNumber(point.psiReference)}</TableCell>
                  <TableCell className="text-right tabular-nums">{psiNumber(point.psiPrevious)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {point.llmRejectedShare !== null ? percent(point.llmRejectedShare) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}
      <p className="text-xs text-muted-foreground italic">
        PSI — индекс стабильности популяции: меньше 0,1 — стабильно, 0,1–0,25 — наблюдать, от 0,25 — распределение сдвинулось,
        модель нужно перепроверить. Меньше {PSI_RELIABLE_N} наблюдений — значение ориентировочное.
      </p>
    </>
  );
}

/** Распределение по корзинам полосами; reference - доли эталона по тем же подписям (тонкая метка) */
function Bars({ title, buckets, reference }: { title: string; buckets: Bucket[]; reference?: Record<string, number> }) {
  return (
    <figure className="mb-3">
      <figcaption className="mb-1 text-xs text-muted-foreground">
        {title}
        {reference ? ' · | — доля в эталоне' : ''}
      </figcaption>
      <ul className="flex flex-col gap-1 text-sm">
        {buckets.map((bucket) => {
          const expected = reference?.[bucket.label];
          return (
            <li key={bucket.label} className="grid grid-cols-[4.5rem_1fr_6rem] items-center gap-2">
              <span>{bucket.label}</span>
              <span className="relative h-3 rounded bg-muted" aria-hidden>
                <span className="absolute inset-y-0 left-0 rounded bg-primary" style={{ width: `${bucket.share * 100}%` }} />
                {expected !== undefined && (
                  <span className="absolute inset-y-[-2px] w-0.5 bg-foreground" style={{ left: `${expected * 100}%` }} />
                )}
              </span>
              <span className="text-right tabular-nums">
                {bucket.count} · {percent(bucket.share)}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

function PsiLine({ title, psi, missing }: { title: string; psi: Psi | null; missing: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{title}:</span>
      {psi ? (
        <>
          <span className="font-semibold tabular-nums">{psiNumber(psi.value)}</span>
          <span className={cn('rounded px-1.5 py-0.5 text-xs', PSI_STATUS[psi.status].className)}>
            {PSI_STATUS[psi.status].title}
          </span>
          <span className="text-xs text-muted-foreground">
            база — {psi.baseline}
            {psi.n < PSI_RELIABLE_N ? `, n = ${psi.n}: ориентировочно` : ''}
          </span>
        </>
      ) : (
        <span className="text-muted-foreground italic">{missing}</span>
      )}
    </div>
  );
}

function psiNumber(value: number | null): string {
  return value === null ? '—' : value.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}
