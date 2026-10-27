import type { Run } from '@/api/types';
import { duration, minutesAsHours, plural } from '@/lib/format';
import { Section } from './Section';

const WORKDAY_MINUTES = 8 * 60;

/** ЭП-9: время прогона и расчётное время ручной проработки тех же клиентов (допущение, Приложение А) */
export function ManualComparison({ comparison }: { comparison: NonNullable<Run['comparison']> }) {
  const perClient = comparison.clients ? Math.round(comparison.manualMinutes / comparison.clients) : 0;
  return (
    <Section title="Сравнение с ручной работой" requirement="ЭП-9">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-sm text-muted-foreground">
            Прогон: {plural(comparison.clients, ['клиент', 'клиента', 'клиентов'])}
          </div>
          <div className="text-3xl font-bold text-success">{duration(comparison.runDurationMs)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">
            Вручную: {plural(comparison.clients, ['клиент', 'клиента', 'клиентов'])} × {minutesAsHours(perClient)}
          </div>
          <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">≈ {workdays(comparison.manualMinutes)}</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground italic">
        Время ручной проработки — допущение команды (Цели и метрики, Приложение А)
      </p>
    </Section>
  );
}

function workdays(minutes: number): string {
  const days = minutes / WORKDAY_MINUTES;
  if (days < 1) return minutesAsHours(minutes);
  if (Number.isInteger(days) || days >= 10) return plural(Math.round(days), ['рабочий день', 'рабочих дня', 'рабочих дней']);
  return `${days.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} рабочего дня`;
}
