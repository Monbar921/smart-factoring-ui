import { render, screen } from '@testing-library/react';
import type { Run } from '@/api/types';
import { approxDuration, progressEstimate } from '@/lib/format';
import { RunSteps } from './RunSteps';

describe('прогресс долгой части шага (Р-57)', () => {
  it('процент и оставшееся время - по скорости с начала этой части шага', () => {
    const since = '2026-10-28T10:00:00Z';
    // 300 из 1 200 карточек за 5 минут - осталось 900 карточек, ещё 15 минут
    expect(progressEstimate({ done: 300, total: 1200, since }, Date.parse('2026-10-28T10:05:00Z'))).toEqual({
      percent: 25,
      remainingMs: 15 * 60 * 1000,
    });
    expect(progressEstimate({ done: 0, total: 1200, since }, Date.parse('2026-10-28T10:00:03Z')).remainingMs).toBeNull();
    expect(approxDuration(15 * 60 * 1000)).toBe('~15 мин');
    expect(approxDuration(37_000)).toBe('~35 с');
    expect(approxDuration(65 * 60 * 1000)).toBe('~1 ч 5 мин');
  });

  it('у идущего шага - строка прогресса с процентом, у завершённых - нет', () => {
    const since = new Date(Date.now() - 60_000).toISOString();
    const step = (stepNo: number, status: 'DONE' | 'RUNNING') => ({
      stepNo,
      name: `Шаг ${stepNo}`,
      status,
      startedAt: null,
      finishedAt: null,
      durationMs: null,
      metrics: null,
      progress: { label: stepNo === 5 ? 'Тексты карточек (gigachat)' : 'Оценка PD', done: 400, total: 1000, since },
    });
    const run = { errorMessage: null, steps: [step(4, 'DONE'), step(5, 'RUNNING')] } as unknown as Run;

    render(<RunSteps run={run} />);

    expect(screen.getAllByTestId('step-progress')).toHaveLength(1);
    expect(screen.getByText('Тексты карточек (gigachat): 400 из 1 000')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText(/осталось ~(1|2) мин/)).toBeInTheDocument();
  });
});

describe('шкала риска в справке - по порогам системы', () => {
  it('тексты уровней берут границы из параметра scoring.risk_level_bounds', async () => {
    const { riskBoundsOf, riskScaleText } = await import('@/lib/risk');
    const bounds = riskBoundsOf([{ code: 'scoring.risk_level_bounds', value: '{"A": 0.01, "B": 0.03, "C": 0.08}' }]);
    expect(riskScaleText('A', bounds)).toBe(
      'Не больше 1 из 100 таких компаний за год не сможет расплатиться по долгам (вероятность до 1 %).',
    );
    expect(riskScaleText('B', bounds)).toBe('От 1 до 3 из 100 (вероятность до 3 %).');
    expect(riskScaleText('D', bounds)).toBe('Больше 8 из 100. Факторинг таким покупателям не предлагаем.');
    // другие пороги в параметрах - другие числа в справке
    expect(
      riskScaleText('A', riskBoundsOf([{ code: 'scoring.risk_level_bounds', value: '{"A": 0.004, "B": 0.015, "C": 0.06}' }])),
    ).toContain('Не больше 0,4 из 100');
    // без параметра или с неверным значением - значения по умолчанию
    expect(riskBoundsOf(undefined)).toEqual({ A: 0.01, B: 0.03, C: 0.08 });
    expect(riskBoundsOf([{ code: 'scoring.risk_level_bounds', value: 'не json' }])).toEqual({ A: 0.01, B: 0.03, C: 0.08 });
  });
});
