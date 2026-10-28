import type { Run } from '@/api/types';
import { duration, minutesAsHours, plural } from '@/lib/format';

const WORKDAY_MINUTES = 8 * 60;

/**
 * Справка про время (ЭП-9, П2-5.3): время прогона и расчётное время ручной проработки тех же клиентов - узкая строка
 * внизу экрана. Время ручной работы - допущение команды (Приложение А).
 */
export function ManualComparison({ comparison }: { comparison: NonNullable<Run['comparison']> }) {
  const perClient = comparison.clients ? Math.round(comparison.manualMinutes / comparison.clients) : 0;
  const clients = plural(comparison.clients, ['клиенту', 'клиентам', 'клиентам']);
  return (
    <p className="rounded-md border bg-muted/40 px-4 py-2 text-[13px] text-muted-foreground" aria-label="Справка про время">
      Справка: прогон по <b className="text-foreground">{clients}</b> занял{' '}
      <b className="text-foreground">{duration(comparison.runDurationMs)}</b>. Вручную это{' '}
      <b className="text-foreground">≈ {workdays(comparison.manualMinutes)}</b> (
      {plural(comparison.clients, ['клиент', 'клиента', 'клиентов'])} × {minutesAsHours(perClient)}). Время ручной работы —
      допущение команды (Цели и метрики, Приложение А).
    </p>
  );
}

function workdays(minutes: number): string {
  const days = minutes / WORKDAY_MINUTES;
  if (days < 1) return minutesAsHours(minutes);
  if (Number.isInteger(days) || days >= 10) return plural(Math.round(days), ['рабочий день', 'рабочих дня', 'рабочих дней']);
  return `${days.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} рабочего дня`;
}
