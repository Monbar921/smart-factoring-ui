/** Форматы и подписи для экранов прогона и CRM */

const moneyFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function money(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${moneyFormat.format(value)} ₽`;
}

export function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : percentFormat.format(value);
}

export function date(value: string | null | undefined): string {
  return value ? dateFormat.format(new Date(`${value.slice(0, 10)}T00:00:00`)) : '—';
}

export function dateTime(value: string | null | undefined): string {
  return value ? timeFormat.format(new Date(value)) : '—';
}

const clockFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Время без даты: 10:41:02 */
export function time(value: string | null | undefined): string {
  return value ? clockFormat.format(new Date(value)) : '—';
}

export function duration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} мс`;
  const seconds = Math.round(ms / 100) / 10;
  if (seconds < 60) return `${seconds.toLocaleString('ru-RU')} с`;
  return `${Math.floor(seconds / 60)} мин ${Math.round(seconds % 60)} с`;
}

/** Оценка оставшегося времени, округлённо: «~40 с», «~9 мин», «~1 ч 5 мин» */
export function approxDuration(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `~${Math.max(5, Math.round(seconds / 5) * 5)} с`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `~${minutes} мин`;
  return `~${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
}

/**
 * Процент и оставшееся время долгой части шага (Р-57): скорость - сделанное с начала этой части;
 * remainingMs null - пока ничего не сделано, оценивать не по чему.
 */
export function progressEstimate(
  progress: { done: number; total: number; since: string },
  now: number,
): { percent: number; remainingMs: number | null } {
  const percent = progress.total > 0 ? Math.min(100, Math.floor((progress.done / progress.total) * 100)) : 100;
  const elapsed = now - new Date(progress.since).getTime();
  const remainingMs =
    progress.done > 0 && elapsed > 0 ? Math.round((elapsed / progress.done) * (progress.total - progress.done)) : null;
  return { percent, remainingMs };
}

/** Сумма коротко, как на макете экрана процесса: 3,4 млн ₽, 850 тыс ₽ */
export function moneyShort(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  const short = (divider: number, unit: string) =>
    `${(value / divider).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ${unit} ₽`;
  if (abs >= 1e9) return short(1e9, 'млрд');
  if (abs >= 1e6) return short(1e6, 'млн');
  if (abs >= 1e4) return short(1e3, 'тыс');
  return money(value);
}

/** Число со словом в нужной форме: plural(3, ['платёж', 'платежа', 'платежей']) - «3 платежа» */
export function plural(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const form = mod10 === 1 && mod100 !== 11 ? 0 : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 1 : 2;
  return `${count.toLocaleString('ru-RU')} ${forms[form]}`;
}

export function minutesAsHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} ч${rest ? ` ${rest} мин` : ''}` : `${rest} мин`;
}

/** Причины отсутствия предложения (п. 5.2, 5.3) */
export const REASONS: Record<string, string> = {
  UPD_PAID: 'УПД оплачен',
  UPD_OVERDUE: 'УПД просрочен',
  ALREADY_DECIDED: 'Уже есть решение менеджера',
  STOP_FACTOR: 'Стоп-фактор',
  NO_BUYER_DATA: 'Нет данных по покупателю',
  NO_PAYMENT_HISTORY: 'Нет истории оплат',
  SCORING_ERROR: 'Ошибка оценки',
  RISK_LEVEL_D: 'Уровень риска D',
  OVERDUE_90_PROBABLE: 'Вероятна просрочка 90+',
  LIMIT_EXHAUSTED: 'Лимит исчерпан',
  DELAY_PROBABLE_LEVEL_C: 'Вероятна задержка при уровне C',
  SMALL_AMOUNT: 'Малый остаток УПД',
  SHORT_TERM: 'Мало дней до оплаты',
  INCOME_BELOW_MIN: 'Доход ниже минимума',
  NOT_IN_TOP_N: 'Не в трёх лучших по клиенту',
  NO_LONGER_ELIGIBLE: 'Больше не проходит правила',
};

export const RUN_STATUSES: Record<string, string> = {
  RUNNING: 'Выполняется',
  DONE: 'Выполнен',
  DONE_WITH_WARNINGS: 'Выполнен с предупреждениями',
  STOPPED: 'Остановлен',
};

export const STEP_STATUSES: Record<string, string> = {
  PENDING: 'Ожидает',
  RUNNING: 'Выполняется',
  DONE: 'Готово',
  WARNING: 'Предупреждение',
  STOPPED: 'Остановлен',
};

export const STOP_FACTORS: Record<string, string> = {
  BANKRUPTCY: 'Банкротство',
  LIQUIDATION: 'Ликвидация',
  EXCLUSION: 'Исключение из ЕГРЮЛ',
};

export const NOTIFICATION_TYPES: Record<string, string> = {
  NEW_OFFER: 'Новое предложение',
  OVERDUE: 'Просрочка оплаты',
  REMINDER: 'Напоминание',
  RISK_SIGNAL: 'Сигнал в риск',
};

export const PAYMENT_STATUSES: Record<string, string> = {
  UNPAID: 'Не оплачен',
  PARTIAL: 'Оплачен частично',
  PAID: 'Оплачен',
};

/** Категории дебиторки (п. 3.1-3.8) */
export const CATEGORIES: Record<number, string> = {
  1: 'Не оплачен, до срока ≤ 30 дн.',
  2: 'Не оплачен, до срока > 30 дн.',
  3: 'Частично, до срока ≤ 30 дн.',
  4: 'Частично, до срока > 30 дн.',
  5: 'Частично, просрочка > 30 дн.',
  6: 'Частично, просрочка ≤ 30 дн.',
  7: 'Не оплачен, просрочка > 30 дн.',
  8: 'Не оплачен, просрочка ≤ 30 дн.',
};

/** Первая буква строчной для середины фразы; аббревиатуры (УПД, PD) - как есть */
export function lowerFirst(text: string): string {
  return /^\p{Lu}{2}/u.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
}

export function label(dictionary: Record<string, string>, code: string | null | undefined): string {
  return code ? (dictionary[code] ?? code) : '—';
}
