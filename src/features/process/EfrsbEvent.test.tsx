import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '@/test/mockApi';
import { renderWithQuery } from '@/test/render';
import { EfrsbEventCard } from './EfrsbEvent';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ user: { access_token: 'test-token' } }),
}));

describe('событие ЕФРСБ (Р-86)', () => {
  it('отправляет событие по выбранному покупателю и показывает итог', async () => {
    const calls = mockApi({
      'GET /api/backend/manual-upload/efrsb-event/buyers': [
        { inn: '7701000001', name: 'ООО «Надёжный партнёр»', queuedOffers: 3, queuedEad: 4500000, transferredOffers: 1 },
      ],
      'POST /api/backend/manual-upload/efrsb-event': {
        buyer: { id: 5, inn: '7701000001', name: 'ООО «Надёжный партнёр»' },
        event: 'Введение наблюдения от 24.10.2026',
        stopFactor: 'BANKRUPTCY',
        revokedOffers: 3,
        revokedEad: 4500000,
        transferredOffers: 1,
        notifiedManagers: 1,
        riskSignal: true,
        message: 'Стоп-фактор: банкротство. Отозвано предложений: 3',
      },
    });
    renderWithQuery(<EfrsbEventCard />);

    expect(await screen.findByRole('option', { name: /Надёжный партнёр.*в очереди 3/ })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Событие'), 'BANKRUPT');
    await userEvent.click(screen.getByRole('button', { name: 'Отправить событие' }));

    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({ buyerInn: '7701000001', kind: 'BANKRUPT' });
    expect(await screen.findByRole('status')).toHaveTextContent('Отозвано предложений: 3');
  });

  it('без действующих предложений - подсказка', async () => {
    mockApi({ 'GET /api/backend/manual-upload/efrsb-event/buyers': [] });
    renderWithQuery(<EfrsbEventCard />);

    expect(await screen.findByText(/Нет покупателей с действующими предложениями/)).toBeInTheDocument();
  });
});
