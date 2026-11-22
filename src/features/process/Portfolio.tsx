import type { Run } from '@/api/types';
import { Hint } from '@/components/Hint';
import { money } from '@/lib/format';
import { Section } from './Section';

const MILLION = 1_000_000;

/**
 * Оценённый объём портфеля (П2-5.1) под воронкой: сделки из очереди, их сумма финансирования и доход банка, если согласятся
 * все клиенты. Числа - из итогов шага 5, новых расчётов нет.
 */
export function Portfolio({ run }: { run: Run }) {
  const metrics = run.steps.find((step) => step.stepNo === 5)?.metrics;
  if (!metrics) return null;
  const deals = Number(metrics.offers ?? 0);
  return (
    <Section title="Оценённый объём портфеля доверительных клиентов, которым можно продать выгодный продукт">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
        <Figure value={deals.toLocaleString('ru-RU')} caption="Сделок можно заключить" />
        <Figure {...amount(Number(metrics.eadTotal ?? 0))} caption="Сумма портфеля, ₽" />
        <Figure {...amount(Number(metrics.incomeTotal ?? 0))} caption="Доход банка, ₽" />
      </div>
    </Section>
  );
}

/** До 1 млн ₽ - полным числом; от 1 млн - «млн ₽» с одним знаком, полное число - в подсказке */
function amount(value: number): { value: string; full?: string } {
  if (Math.abs(value) < MILLION) return { value: money(value) };
  return {
    value: `${(value / MILLION).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} млн ₽`,
    full: money(value),
  };
}

function Figure({ value, full, caption }: { value: string; full?: string; caption: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-[#12794A] tabular-nums">{full ? <Hint text={full}>{value}</Hint> : value}</div>
      <div className="text-xs text-muted-foreground">{caption}</div>
    </div>
  );
}
