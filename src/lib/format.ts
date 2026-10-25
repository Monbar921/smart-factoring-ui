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

export function duration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} мс`;
  const seconds = Math.round(ms / 100) / 10;
  if (seconds < 60) return `${seconds.toLocaleString('ru-RU')} с`;
  return `${Math.floor(seconds / 60)} мин ${Math.round(seconds % 60)} с`;
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

export function label(dictionary: Record<string, string>, code: string | null | undefined): string {
  return code ? (dictionary[code] ?? code) : '—';
}
