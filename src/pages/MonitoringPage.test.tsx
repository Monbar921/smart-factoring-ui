import { screen } from '@testing-library/react';
import type { Monitoring } from '@/api/types';
import { mockApi } from '@/test/mockApi';
import { renderWithQuery } from '@/test/render';
import { MonitoringPage } from './MonitoringPage';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ user: { access_token: 'test-token' } }),
}));

const MONITORING: Monitoring = {
  runId: 12,
  status: 'DONE',
  calcDate: '2026-10-24',
  startedAt: '2026-11-21T10:00:00+03:00',
  models: { pd: 'pd-1.0', delay: 'delay-1.0', llm: 'gigachat:GigaChat-2:v4' },
  pd: {
    buyers: 300,
    bySource: { MODEL: 260, BASE: 40 },
    stopFactors: 3,
    fromCache: 0,
    meanPd: 0.012,
    levels: [
      { label: 'A', count: 150, share: 0.5 },
      { label: 'B', count: 90, share: 0.3 },
      { label: 'C', count: 45, share: 0.15 },
      { label: 'D', count: 15, share: 0.05 },
    ],
    modelLevels: [],
    psiReference: { value: 0.312, status: 'SHIFT', baseline: 'выборка разработки модели', baselineRunId: null, n: 260 },
    psiPrevious: { value: 0.004, status: 'STABLE', baseline: 'запуск № 11', baselineRunId: 11, n: 300 },
    reference: {
      sample: 'pd-1.0: out-of-fold прогнозы обучения, когорта 2022',
      size: 174351,
      cuts: [0.004, 0.015, 0.06],
      shares: { A: 0.626, B: 0.235, C: 0.095, D: 0.044 },
    },
  },
  delay: {
    upds: 1500,
    byStatus: { SCORED: 1400, NO_PAYMENT_HISTORY: 100 },
    meanPDelay: 0.21,
    thresholdDays: 14,
    buckets: [{ label: '< 10 %', count: 500, share: 0.33 }],
    psiPrevious: null,
  },
  llm: {
    provider: 'gigachat:GigaChat-2:v4',
    cards: 40,
    bySource: { LLM: 38, TEMPLATE: 2 },
    answers: 84,
    rejected: 6,
    rejectedShare: 0.0714,
    templateAfterFactCheck: 2,
  },
  history: [
    {
      runId: 12,
      calcDate: '2026-10-24',
      startedAt: '2026-11-21T10:00:00+03:00',
      pdVersion: 'pd-1.0',
      buyers: 300,
      psiReference: 0.312,
      psiPrevious: 0.004,
      llmRejectedShare: 0.0714,
    },
    {
      runId: 11,
      calcDate: '2026-10-23',
      startedAt: '2026-11-20T03:00:00+03:00',
      pdVersion: 'pd-1.0',
      buyers: 298,
      psiReference: 0.309,
      psiPrevious: null,
      llmRejectedShare: 0.05,
    },
  ],
};

describe('мониторинг моделей (Р-87)', () => {
  it('открывается по последнему запуску: версии, PSI, доля отклонённых ответов LLM, тренд', async () => {
    mockApi({
      'GET /api/backend/runs': {
        items: [{ id: 12, status: 'DONE', calcDate: '2026-10-24' }],
        page: 0,
        size: 50,
        total: 1,
      },
      'GET /api/backend/runs/12/monitoring': MONITORING,
    });
    renderWithQuery(<MonitoringPage />);

    expect(await screen.findByText('pd-1.0', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('сдвиг — перепроверить модель')).toBeInTheDocument();
    expect(screen.getByText('стабильно')).toBeInTheDocument();
    expect(screen.getByText(/6 из 84 ответов/)).toBeInTheDocument();
    expect(screen.getByText('Тренд по запускам')).toBeInTheDocument();
    expect(screen.getByText('№ 11')).toBeInTheDocument();
    // у модели задержки прошлого запуска нет
    expect(screen.getByText('первый запуск на этой версии модели')).toBeInTheDocument();
  });

  it('без завершённых запусков - подсказка', async () => {
    mockApi({ 'GET /api/backend/runs': { items: [], page: 0, size: 50, total: 0 } });
    renderWithQuery(<MonitoringPage />);

    expect(await screen.findByText(/Нет завершённых запусков/)).toBeInTheDocument();
  });
});
