import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Offer } from '@/api/types';
import { mockApi } from '@/test/mockApi';
import { renderWithQuery } from '@/test/render';
import { CrmPage } from './CrmPage';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ user: { access_token: 'test-token' } }),
}));

const OFFER: Offer = {
  offerId: 11,
  status: 'QUEUED',
  updId: 104,
  updNumber: 'U-1004',
  updDate: '2026-10-01',
  updOutstanding: 5000000,
  client: { id: 1, inn: '7710000001', name: 'ООО «Альфа-Трейд»' },
  buyer: { id: 1, inn: '0277120989', name: 'ООО «БРИГ»' },
  ead: 4500000,
  price: 102082,
  priceRate: 0.207,
  termDays: 40,
  riskLevel: 'A',
  pd: 0.005,
  income: 14795,
  el: 360,
  tr: 0.105,
  rank: 1553,
  flags: { delayProbable: false, lowData: false, reducedToLimit: false, isNew: true },
  reasons: [
    { feature: 'current_ratio', title: 'Текущая ликвидность', value: 1.57, direction: 'DECREASES_RISK', contribution: 0.4 },
  ],
  reasonsText: 'Покупатель надёжный.',
  messageDraft: 'Добрый день! Банк готов выплатить 4 500 000 руб.',
  queuedAt: '2026-10-25T10:00:00+03:00',
  lastRunId: 7,
  revokeReason: null,
  decidedBy: null,
  decidedAt: null,
};

describe('CrmPage', () => {
  it('показывает очередь, карточку предложения и передаёт предложение в факторинг', async () => {
    const calls = mockApi({
      'GET /api/backend/managers': [{ id: 1, code: 'M1', fullName: 'Демо-менеджер', queuedOffers: 1, notifications: 1 }],
      'GET /api/backend/managers/1/queue': [OFFER],
      'GET /api/backend/managers/1/notifications': {
        items: [
          {
            id: 5,
            runId: 7,
            type: 'OVERDUE',
            createdAt: '2026-10-25T10:00:00+03:00',
            client: OFFER.client,
            buyer: null,
            updId: 1,
            updNumber: 'U-4004',
            offerId: null,
            payload: { outstanding: 1000000, overdueDays: 51 },
          },
        ],
        page: 0,
        size: 200,
        total: 1,
      },
      'GET /api/backend/clients/1/card': {
        client: OFFER.client,
        absLiquidity: 0.35,
        runId: 7,
        calcDate: '2026-10-24',
        dataDate: '2026-10-24',
        snapshotDate: '2026-10-20',
        summary: { receivablesTotal: 17300000, overdue: 300000, availableForFinancing: 4500000, cashGap: null },
        offers: [OFFER],
        decidedOffers: [],
        upds: [],
      },
      'POST /api/backend/offers/11/transfer': { offer: { ...OFFER, status: 'TRANSFERRED' }, packageId: 1 },
    });

    renderWithQuery(<CrmPage />);

    await userEvent.click(await screen.findByText('U-1004'));
    expect(await screen.findByText('Добрый день! Банк готов выплатить 4 500 000 руб.')).toBeInTheDocument();
    expect(screen.getByText('Покупатель надёжный.')).toBeInTheDocument();
    expect(await screen.findByText('Карточка клиента: ООО «Альфа-Трейд»')).toBeInTheDocument();
    expect(screen.getByText('Просрочка оплаты')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Передать в факторинг' }));

    expect(calls.some((call) => call.method === 'POST' && call.url === '/api/backend/offers/11/transfer')).toBe(true);
  });
});
