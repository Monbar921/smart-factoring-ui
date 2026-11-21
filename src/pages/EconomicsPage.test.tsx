import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { EconomicEffect, EconomicOffers } from '@/api/types';
import { mockApi } from '@/test/mockApi';
import { renderWithQuery } from '@/test/render';
import { EconomicsPage } from './EconomicsPage';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ user: { access_token: 'test-token' } }),
}));

const OFFERS: EconomicOffers = {
  offers: 12,
  belowMinIncome: 0,
  portfolioEad: 40_000_000,
  portfolioIncome: 400_000,
  expectedDeals: 1.2,
  expectedEad: 4_000_000,
  revenue: 90_000,
  funding: 70_000,
  expectedLoss: 4_000,
  opex: 6_000,
  income: 10_000,
  avgTermDays: 40,
};

function effect(fundingRate: number, belowMinIncome = 0): EconomicEffect {
  return {
    runId: 7,
    calcDate: '2026-10-20',
    clients: 100,
    run: { fundingRate: 0.16, trBase: 0.07 },
    scenario: { fundingRate, trBase: 0.07 },
    base: OFFERS,
    result: { ...OFFERS, belowMinIncome, income: fundingRate > 0.16 ? 5_000 : 10_000 },
    year: { turnover: 9.1, expectedEad: 36_500_000, income: 91_000 },
    time: { savedHoursPerYear: 1_200, savedFte: 0.6, savedRub: 1_800_000 },
    scales: [
      {
        code: 'DEMO',
        title: 'Демо: клиенты прогона',
        clients: 100,
        expectedEad: 3.6e7,
        income: 91_000,
        runCost: 1.086e7,
        effect: -1.077e7,
        savedFte: 0.6,
        paybackMonths: null,
      },
      {
        code: 'CORE',
        title: '«Ядро»',
        clients: 5_759,
        expectedEad: 2.1e9,
        income: 5.2e7,
        runCost: 1.43e7,
        effect: 3.77e7,
        savedFte: 35,
        paybackMonths: 5.9,
      },
      {
        code: 'SEGMENT',
        title: 'Весь сегмент',
        clients: 22_641,
        expectedEad: 8.2e9,
        income: 2.06e8,
        runCost: 2.44e7,
        effect: 1.8e8,
        savedFte: 138,
        paybackMonths: 1.2,
      },
    ],
    assumptions: {
      coreClients: 5_759,
      segmentClients: 22_641,
      implementationCost: 18_600_000,
      fixedAnnualCost: 10_800_000,
      annualCostPerClient: 600,
      reviewsPerYear: 4,
      managerHourCost: 1_500,
      fteHoursPerYear: 1_970,
      manualMinutesPerClient: 200,
      systemMinutesPerClient: 20,
    },
  };
}

function routes() {
  return {
    'GET /api/backend/runs': {
      items: [
        {
          id: 7,
          status: 'DONE',
          calcDate: '2026-10-20',
          startedAt: '',
          finishedAt: '',
          durationMs: 1,
          initiator: null,
          initiatorRole: null,
          clientCount: 100,
          openUpdCount: 1500,
          offerCount: 12,
        },
      ],
      page: 0,
      size: 50,
      total: 1,
    },
  };
}

describe('EconomicsPage', () => {
  it('последний запуск при его ставках: цепочка дохода, год и окупаемость по масштабам', async () => {
    mockApi({ ...routes(), 'GET /api/backend/runs/7/economics': effect(0.16) });
    renderWithQuery(<EconomicsPage />);

    expect(await screen.findByText('Доход банка по этому запуску')).toBeInTheDocument();
    expect(screen.getByText('Процентный доход (цена для клиентов)')).toBeInTheDocument();
    expect(screen.getByText('не окупается')).toBeInTheDocument();
    expect(screen.getByText('5,9 мес.')).toBeInTheDocument();
    expect(screen.queryByText('В запуске')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Как в запуске' })).not.toBeInTheDocument();
  });

  it('ползунок ставки фондирования пересчитывает эффект и показывает выпавшие предложения', async () => {
    const calls = mockApi({
      ...routes(),
      'GET /api/backend/runs/7/economics': () => {
        const url = calls.at(-1)!.url;
        return url.includes('fundingRate=0.2') ? effect(0.2, 3) : effect(0.16);
      },
    });
    renderWithQuery(<EconomicsPage />);

    const slider = await screen.findByRole('slider', { name: /Ставка фондирования/ });
    fireEvent.change(slider, { target: { value: '0.2' } });

    await waitFor(() => expect(calls.some((call) => call.url.endsWith('/runs/7/economics?fundingRate=0.2'))).toBe(true));
    expect(await screen.findByText(/3 предложения приносят меньше минимального дохода/)).toBeInTheDocument();
    expect(screen.getByText('В запуске')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Как в запуске' })).toBeInTheDocument();
  });
});
