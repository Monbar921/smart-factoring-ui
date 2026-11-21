import { useEffect, useState } from 'react';
import { useEconomics, useRuns } from '@/api/backend';
import type { EconomicEffect, EconomicOffers } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Section } from '@/features/process/Section';
import { date, moneyShort, plural } from '@/lib/format';
import { openEconomics } from '@/lib/useHashRoute';

/** ползунок отпущен - пересчёт через 300 мс, чтобы не слать запрос на каждый шаг */
const DEBOUNCE_MS = 300;
const FUNDING = { min: 0.08, max: 0.24, step: 0.005 };
const TR = { min: 0.02, max: 0.3, step: 0.005 };

/**
 * Экономический эффект запуска (дорожная карта, п. 1.2; Р-76): предложения запуска при выбранных ставке фондирования
 * и базовом TR, цепочка «процентный доход − расходы = доход банка», год и окупаемость в трёх масштабах. Все суммы
 * считает backend тем же расчётом, что анализ дебиторки: при ставках запуска числа совпадают с портфелем на экране процесса.
 */
export function EconomicsPage({ runId: requested = null }: { runId?: number | null }) {
  const runs = useRuns();
  const finished = runs.data?.items.filter((run) => run.status === 'DONE' || run.status === 'DONE_WITH_WARNINGS') ?? [];
  const runId = requested ?? finished[0]?.id ?? null;
  const [funding, setFunding] = useState<number | null>(null);
  const [tr, setTr] = useState<number | null>(null);
  const fundingQuery = useDebounced(funding);
  const trQuery = useDebounced(tr);
  const effect = useEconomics(runId, fundingQuery, trQuery);
  const data = effect.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Запуск
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={runId ?? ''}
            onChange={(event) => {
              setFunding(null);
              setTr(null);
              openEconomics(Number(event.target.value));
            }}
          >
            {finished.map((run) => (
              <option key={run.id} value={run.id}>
                № {run.id} от {date(run.calcDate)}
                {run.clientCount !== null ? `, ${plural(run.clientCount, ['клиент', 'клиента', 'клиентов'])}` : ''}
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
      {effect.isError && <p className="text-destructive">Не удалось посчитать эффект: {String(effect.error.message)}</p>}
      {runId !== null && effect.isPending && <Skeleton className="h-64 w-full" />}

      {data && (
        <>
          <Section
            title="Условия расчёта"
            actions={
              (funding !== null || tr !== null) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFunding(null);
                    setTr(null);
                  }}
                >
                  Как в запуске
                </Button>
              )
            }
          >
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
              <Slider
                label="Ставка фондирования, годовых"
                hint={`В запуске ${pct(data.run.fundingRate)}. Выше ставка — дороже деньги для банка; цена для клиента не выше рыночной (24%), поэтому доход банка падает, а часть предложений перестаёт окупаться.`}
                value={funding ?? data.run.fundingRate}
                range={FUNDING}
                onChange={setFunding}
              />
              <Slider
                label="Базовый шанс, что клиент согласится (TR)"
                hint={`В запуске ${pct(data.run.trBase)}. У клиентов с нехваткой денег или долгой отсрочкой шанс выше базового в 1,5 раза за каждый признак; на пилоте TR заменит модель по решениям менеджеров.`}
                value={tr ?? data.run.trBase}
                range={TR}
                onChange={setTr}
              />
            </div>
          </Section>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
            <IncomeChain effect={data} />
            <YearAndTime effect={data} />
          </div>

          <Scales effect={data} />
          <Assumptions effect={data} />
        </>
      )}
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  range,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  range: { min: number; max: number; step: number };
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{label}</span>
        <span className="text-lg font-bold tabular-nums">{pct(value)}</span>
      </span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-primary"
      />
      <span className="text-xs text-muted-foreground">{hint}</span>
    </label>
  );
}

/** Из чего складывается доход банка по предложениям запуска, с учётом шанса согласия */
function IncomeChain({ effect }: { effect: EconomicEffect }) {
  const { base, result } = effect;
  const changed = JSON.stringify(effect.run) !== JSON.stringify(effect.scenario);
  const rows: { title: string; key: keyof EconomicOffers; sign?: '−' | '=' }[] = [
    { title: 'Процентный доход (цена для клиентов)', key: 'revenue' },
    { title: 'Фондирование', key: 'funding', sign: '−' },
    { title: 'Ожидаемые потери (PD × LGD × сумма)', key: 'expectedLoss', sign: '−' },
    { title: 'Операционные расходы', key: 'opex', sign: '−' },
    { title: 'Доход банка', key: 'income', sign: '=' },
  ];
  return (
    <Section title="Доход банка по этому запуску">
      <p className="mb-3 text-sm text-muted-foreground">
        {plural(result.offers, ['предложение', 'предложения', 'предложений'])} на{' '}
        <b className="text-foreground">{moneyShort(result.portfolioEad)}</b>. Если согласятся все — доход{' '}
        {moneyShort(result.portfolioIncome)}. С учётом шанса согласия ожидается{' '}
        <b className="text-foreground">{fmt(result.expectedDeals, 1)}</b> сделок на{' '}
        <b className="text-foreground">{moneyShort(result.expectedEad)}</b>:
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead />
            <TableHead className="text-right">{changed ? 'Сценарий' : 'Ожидается'}</TableHead>
            {changed && <TableHead className="text-right">В запуске</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} className={row.sign === '=' ? 'font-semibold' : undefined}>
              <TableCell>
                {row.sign && <span className="mr-1 text-muted-foreground">{row.sign}</span>}
                {row.title}
              </TableCell>
              <TableCell className="text-right tabular-nums">{moneyShort(result[row.key])}</TableCell>
              {changed && (
                <TableCell className="text-right text-muted-foreground tabular-nums">{moneyShort(base[row.key])}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {result.belowMinIncome > 0 && (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
          При этой ставке {plural(result.belowMinIncome, ['предложение', 'предложения', 'предложений'])} приносят меньше
          минимального дохода и выпадают из очереди.
        </p>
      )}
    </Section>
  );
}

function YearAndTime({ effect }: { effect: EconomicEffect }) {
  const { year, time, result } = effect;
  return (
    <Section title="За год">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <Figure value={moneyShort(year.income)} caption="Доход банка за год" />
        <Figure value={moneyShort(year.expectedEad)} caption="Профинансировано за год" />
        <Figure value={`${fmt(time.savedHoursPerYear, 0)} ч`} caption="Высвобождается времени менеджеров" />
        <Figure value={fmt(time.savedFte, 1)} caption="Ставок менеджеров" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Средний срок финансирования {fmt(result.avgTermDays, 0)} дн.: за год дебиторка клиентов обновляется ≈
        {fmt(year.turnover, 1)} раза, и каждый раз анализ находит новые УПД. Время: {effect.clients} клиентов ×{' '}
        {effect.assumptions.reviewsPerYear} проработки в год × ({effect.assumptions.manualMinutesPerClient} −{' '}
        {effect.assumptions.systemMinutesPerClient}) мин. Время в окупаемость не входит: менеджер тратит его на продажи.
      </p>
    </Section>
  );
}

function Scales({ effect }: { effect: EconomicEffect }) {
  return (
    <Section title="Масштаб и окупаемость внедрения">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Масштаб</TableHead>
              <TableHead className="text-right">Клиентов</TableHead>
              <TableHead className="text-right">Финансирование в год</TableHead>
              <TableHead className="text-right">Доход банка в год</TableHead>
              <TableHead className="text-right">Сопровождение в год</TableHead>
              <TableHead className="text-right">Эффект в год</TableHead>
              <TableHead className="text-right">Окупаемость</TableHead>
              <TableHead className="text-right">Ставок менеджеров</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {effect.scales.map((scale) => (
              <TableRow key={scale.code}>
                <TableCell>{scale.title}</TableCell>
                <TableCell className="text-right tabular-nums">{scale.clients.toLocaleString('ru-RU')}</TableCell>
                <TableCell className="text-right tabular-nums">{moneyShort(scale.expectedEad)}</TableCell>
                <TableCell className="text-right tabular-nums">{moneyShort(scale.income)}</TableCell>
                <TableCell className="text-right tabular-nums">{moneyShort(scale.runCost)}</TableCell>
                <TableCell
                  className={`text-right font-semibold tabular-nums ${scale.effect < 0 ? 'text-destructive' : 'text-[#12794A]'}`}
                >
                  {moneyShort(scale.effect)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {scale.paybackMonths === null ? 'не окупается' : `${fmt(scale.paybackMonths, 1)} мес.`}
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmt(scale.savedFte, 1)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Масштаб — годовой доход клиентов запуска в среднем на клиента × число клиентов. Эффект = доход банка − сопровождение;
        окупаемость = внедрение {moneyShort(effect.assumptions.implementationCost)} / эффект в месяц.
      </p>
    </Section>
  );
}

function Assumptions({ effect }: { effect: EconomicEffect }) {
  const a = effect.assumptions;
  return (
    <p className="rounded-md border bg-muted/40 px-4 py-2 text-[13px] text-muted-foreground" aria-label="Допущения">
      Допущения команды, уточняются на пилоте: внедрение {moneyShort(a.implementationCost)}; сопровождение{' '}
      {moneyShort(a.fixedAnnualCost)} в год + {moneyShort(a.annualCostPerClient)} на клиента; час менеджера{' '}
      {moneyShort(a.managerHourCost)}; ставка — {a.fteHoursPerYear.toLocaleString('ru-RU')} ч в год. «Ядро» (
      {a.coreClients.toLocaleString('ru-RU')}) и сегмент ({a.segmentClients.toLocaleString('ru-RU')}) — компании с выручкой 0,8–2
      млрд ₽ по открытой отчётности (RFSD). Клиенты демо синтетические: на пилоте суммы пересчитаются на реальных данных.
    </p>
  );
}

function Figure({ value, caption }: { value: string; caption: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-[#12794A] tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{caption}</div>
    </div>
  );
}

function useDebounced(value: number | null): number | null {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

function pct(value: number): string {
  return `${(value * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;
}

function fmt(value: number, digits: number): string {
  return value.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
