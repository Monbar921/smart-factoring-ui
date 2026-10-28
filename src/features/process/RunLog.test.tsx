import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '@/test/mockApi';
import { renderWithQuery } from '@/test/render';
import { RunLog } from './RunLog';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ user: { access_token: 'test-token' } }),
}));

const entry = (id: number, eventCode: string, message: string) => ({
  id,
  loggedAt: '2026-10-28T10:00:00+03:00',
  level: 'INFO',
  stepNo: 1,
  eventCode,
  message,
  clientId: null,
  buyerId: null,
  updId: null,
  offerId: null,
  details: null,
});

describe('журнал прогона', () => {
  it('события по-русски, записи по страницам с «X–Y из N»', async () => {
    const calls = mockApi({
      'GET /api/backend/runs/2/log': {
        items: [entry(1, 'NO_BUYER_DATA', 'Нет данных по покупателю ИНН 7327050690'), entry(2, 'NEW_CODE', 'новое событие')],
        page: 0,
        size: 300,
        total: 3865,
      },
    });
    renderWithQuery(<RunLog runId={2} isRunning={false} />);

    // текст сам начинается с названия события - без повтора «Нет данных по покупателю: Нет данных…»
    expect(await screen.findByText('Нет данных по покупателю ИНН 7327050690')).toHaveAttribute('title', 'NO_BUYER_DATA');
    expect(screen.queryByText('Нет данных по покупателю:')).not.toBeInTheDocument();
    expect(screen.getByText('NEW_CODE:')).toBeInTheDocument();
    expect(screen.getByText('Записи 1–300 из 3 865')).toBeInTheDocument();
    expect(screen.getByText('1 / 13')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Следующие записи журнала' }));
    expect(calls.some((call) => call.url.includes('/runs/2/log') && call.url.includes('page=1'))).toBe(true);
  });
});
