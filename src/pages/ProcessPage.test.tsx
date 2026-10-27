import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Run } from '@/api/types';
import { mockApi } from '@/test/mockApi';
import { renderWithQuery } from '@/test/render';
import { ProcessPage } from './ProcessPage';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ user: { access_token: 'test-token' } }),
}));

const RUN: Run = {
  id: 7,
  status: 'DONE',
  calcDate: '2026-10-24',
  clientInns: null,
  initiatorType: 'OPERATOR',
  initiator: 'operator',
  startedAt: '2026-10-25T10:00:00+03:00',
  finishedAt: '2026-10-25T10:00:02+03:00',
  durationMs: 2000,
  dataDate: '2026-10-24',
  snapshotDate: '2026-10-20',
  modelVersions: { pd: 'pd-stub-1' },
  errorMessage: null,
  steps: [
    {
      stepNo: 1,
      name: 'Загрузка данных',
      status: 'DONE',
      startedAt: null,
      finishedAt: null,
      durationMs: 300,
      metrics: { clients: 6, buyersWithoutData: 1 },
    },
    {
      stepNo: 2,
      name: 'Сверка оплат',
      status: 'DONE',
      startedAt: null,
      finishedAt: null,
      durationMs: 100,
      metrics: { paymentsUnallocated: 1 },
    },
    {
      stepNo: 3,
      name: 'Категоризация дебиторки',
      status: 'DONE',
      startedAt: null,
      finishedAt: null,
      durationMs: 100,
      metrics: { openUpds: 28 },
    },
    {
      stepNo: 4,
      name: 'Скоринг покупателей',
      status: 'WARNING',
      startedAt: null,
      finishedAt: null,
      durationMs: 100,
      metrics: { scoringErrors: 1 },
    },
    {
      stepNo: 5,
      name: 'Решение и предложение',
      status: 'DONE',
      startedAt: null,
      finishedAt: null,
      durationMs: 100,
      metrics: { offers: 12, noOfferByReason: { STOP_FACTOR: 2 } },
    },
  ],
  comparison: { clients: 6, manualMinutes: 1200, systemMinutes: 120, runDurationMs: 2000 },
};

function routes() {
  return {
    'GET /api/backend/runs/defaults': { dataDate: '2026-10-24', snapshotDate: '2026-10-20', clients: [], runningRunId: null },
    'GET /api/backend/runs': {
      items: [
        {
          id: 7,
          status: 'DONE',
          calcDate: '2026-10-24',
          startedAt: RUN.startedAt,
          finishedAt: null,
          durationMs: 2000,
          initiator: 'operator',
          clientCount: 6,
          openUpdCount: 28,
          offerCount: 12,
          eadTotal: 41975000,
        },
      ],
      page: 0,
      size: 50,
      total: 1,
    },
    'GET /api/backend/runs/7': RUN,
    'GET /api/backend/runs/7/funnel': [
      { code: 'OPEN', title: 'Открытые УПД', count: 28, amount: 1, dropped: [] },
      {
        code: 'NO_STOP_FACTOR',
        title: 'Без стоп-факторов',
        count: 22,
        amount: 1,
        dropped: [{ reason: 'STOP_FACTOR', count: 2, amount: 5500000 }],
      },
    ],
    'GET /api/backend/runs/7/upds': { items: [], page: 0, size: 25, total: 0 },
    'GET /api/backend/runs/7/log': {
      items: [
        {
          id: 1,
          loggedAt: RUN.startedAt,
          level: 'INFO',
          stepNo: null,
          eventCode: 'RUN_STARTED',
          message: 'Прогон запущен',
          clientId: null,
          buyerId: null,
          updId: null,
          offerId: null,
          details: null,
        },
      ],
      page: 0,
      size: 300,
      total: 1,
    },
    'POST /api/backend/runs': { runId: 8 },
  };
}

describe('ProcessPage', () => {
  it('показывает последний прогон: шаги со статусами и числами, воронку, журнал и сравнение с ручной работой', async () => {
    mockApi(routes());

    renderWithQuery(<ProcessPage />);

    // ЭП-1: строка состояния прогона под запуском
    expect(await screen.findByText(/Прогон № 7 · выполнен/)).toBeInTheDocument();
    // ЭП-2, ЭП-3: шаги со статусом и строкой-итогом, сбой - отдельной строкой
    expect(within(screen.getByTestId('step-1')).getByText(/6 клиентов/)).toBeInTheDocument();
    const step4 = screen.getByTestId('step-4');
    expect(within(step4).getByText('Предупреждение')).toBeInTheDocument();
    expect(within(step4).getByText('ошибок оценки: 1')).toBeInTheDocument();
    expect(within(screen.getByTestId('step-5')).getByText(/с предложением 12/)).toBeInTheDocument();
    // ЭП-4: причина отсева справа от ступени
    expect(await screen.findByRole('button', { name: 'стоп-фактор' })).toBeInTheDocument();
    expect(screen.getByText(/−2/)).toBeInTheDocument();
    // ЭП-9 и ЭП-6
    expect(screen.getByText('≈ 2,5 рабочего дня')).toBeInTheDocument();
    expect(screen.getByText(/запуск прогона № 7 \(operator\)/)).toBeInTheDocument();
    expect(screen.getByText(/модель PD pd-stub-1/)).toBeInTheDocument();
  });

  it('запускает прогон с датой расчёта по умолчанию - последней датой данных', async () => {
    const calls = mockApi(routes());

    renderWithQuery(<ProcessPage />);
    const button = await screen.findByRole('button', { name: 'Запустить прогон' });
    await userEvent.click(button);

    const post = calls.find((call) => call.method === 'POST');
    expect(post?.body).toEqual({ clientInns: null, calcDate: '2026-10-24' });
  });

  it('кнопка запуска снова доступна, когда прогон закончился', async () => {
    let runningRunId: number | null = 8;
    mockApi({
      ...routes(),
      'GET /api/backend/runs/defaults': () => ({ dataDate: '2026-10-24', snapshotDate: '2026-10-20', clients: [], runningRunId }),
    });

    renderWithQuery(<ProcessPage />);
    expect(await screen.findByRole('button', { name: 'Прогон выполняется…' })).toBeDisabled();

    runningRunId = null;
    expect(await screen.findByRole('button', { name: 'Запустить прогон' }, { timeout: 5000 })).toBeEnabled();
  });
});
