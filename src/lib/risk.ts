import type { RiskLevel } from '@/api/types';

/**
 * Риск покупателя простым языком (замечания 28.10, П2-1): насколько вероятно, что покупатель не сможет расплатиться
 * по долгам. Одни и те же слова - в очереди, карточке, справке и результатах прогона.
 */
export const RISK_SCALE: Record<RiskLevel, { word: string; title: string }> = {
  A: { word: 'надёжный', title: 'надёжный покупатель' },
  B: { word: 'средний', title: 'средний риск' },
  C: { word: 'повышенный', title: 'повышенный риск' },
  D: { word: 'высокий', title: 'высокий риск' },
};

/** Верхние границы вероятности дефолта уровней A–C (параметр scoring.risk_level_bounds); выше C - уровень D */
export type RiskBounds = Record<'A' | 'B' | 'C', number>;

/** Значения по умолчанию (Р-13) - пока параметры не загрузились */
export const DEFAULT_RISK_BOUNDS: RiskBounds = { A: 0.01, B: 0.03, C: 0.08 };

/** Границы уровней из параметров системы; без параметра или с неверным значением - по умолчанию */
export function riskBoundsOf(parameters: { code: string; value: string }[] | undefined): RiskBounds {
  const raw = parameters?.find((parameter) => parameter.code === 'scoring.risk_level_bounds')?.value;
  try {
    const bounds = JSON.parse(raw ?? 'null') as Partial<RiskBounds> | null;
    if (bounds && [bounds.A, bounds.B, bounds.C].every((value) => typeof value === 'number')) return bounds as RiskBounds;
  } catch {
    // неверный JSON - по умолчанию
  }
  return DEFAULT_RISK_BOUNDS;
}

/**
 * Шкала словами по тем порогам, по которым система считает уровни (решение 28.10): «из 100» и проценты в справке
 * совпадают с расчётом.
 */
export function riskScaleText(level: RiskLevel, bounds: RiskBounds): string {
  const pct = (value: number) => (value * 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  if (level === 'A') {
    const verb = bounds.A * 100 <= 1 ? 'не сможет' : 'не смогут';
    return `Не больше ${pct(bounds.A)} из 100 таких компаний за год ${verb} расплатиться по долгам (вероятность до ${pct(bounds.A)} %).`;
  }
  if (level === 'B') return `От ${pct(bounds.A)} до ${pct(bounds.B)} из 100 (вероятность до ${pct(bounds.B)} %).`;
  if (level === 'C') return `От ${pct(bounds.B)} до ${pct(bounds.C)} из 100 (вероятность до ${pct(bounds.C)} %).`;
  return `Больше ${pct(bounds.C)} из 100. Факторинг таким покупателям не предлагаем.`;
}

export const RISK_HELP_TITLE = 'Что значат уровни риска';
export const RISK_HELP_INTRO = 'Риск покупателя — это то, насколько вероятно, что покупатель не сможет расплатиться по долгам.';

/**
 * «Из 100»: вероятность в процентах, округлённая до целого; меньше 1 % - «меньше 1 из 100».
 *
 * @param probability доля (0,0158 = 1,58 %)
 */
export function outOf100(probability: number): { count: number; text: string } {
  const percent = probability * 100;
  if (percent < 1) return { count: 0, text: 'меньше 1 из 100' };
  const count = Math.round(percent);
  return { count, text: `около ${count} из 100` };
}

/** «Риск покупателя: B, средний. Около 2 из 100 таких компаний за год не смогут расплатиться по долгам» */
export function buyerRiskSentence(level: RiskLevel, pd: number | null): string {
  const head = `Риск покупателя: ${level}, ${RISK_SCALE[level].word}.`;
  if (pd === null) return head;
  const { count, text } = outOf100(pd);
  const verb = count <= 1 ? 'не сможет' : 'не смогут';
  return `${head} ${capitalize(text)} таких компаний за год ${verb} расплатиться по долгам.`;
}

/** «Задержка оплаты: из 100 таких счетов около 7 оплатят позже срока больше чем на 14 дней» */
export function delaySentence(pDelay: number, thresholdDays: number): string {
  const { count } = outOf100(pDelay);
  const days = `${thresholdDays} ${dayWord(thresholdDays)}`;
  if (count === 0) return `Задержка оплаты: из 100 таких счетов меньше одного оплатят позже срока больше чем на ${days}.`;
  const verb = count === 1 ? 'оплатит' : 'оплатят';
  return `Задержка оплаты: из 100 таких счетов около ${count} ${verb} позже срока больше чем на ${days}.`;
}

function dayWord(days: number): string {
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
