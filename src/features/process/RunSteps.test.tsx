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
