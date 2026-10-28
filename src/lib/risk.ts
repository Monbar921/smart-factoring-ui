import type { RiskLevel } from '@/api/types';

/**
 * Риск покупателя простым языком (замечания 28.10, П2-1): насколько вероятно, что покупатель не сможет расплатиться
 * по долгам. Одни и те же слова - в очереди, карточке, справке и результатах прогона.
 */
export const RISK_SCALE: Record<RiskLevel, { word: string; title: string; text: string }> = {
  A: {
    word: 'надёжный',
    title: 'надёжный покупатель',
    text: 'Меньше 1 из 100 таких компаний за год не сможет расплатиться по долгам (вероятность до 0,4 %).',
  },
  B: { word: 'средний', title: 'средний риск', text: 'Около 1 из 100 (до 1,5 %).' },
  C: { word: 'повышенный', title: 'повышенный риск', text: 'Несколько из 100 (до 6 %).' },
  D: {
    word: 'высокий',
    title: 'высокий риск',
    text: 'Больше 6 из 100. Факторинг таким покупателям не предлагаем.',
  },
};

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
