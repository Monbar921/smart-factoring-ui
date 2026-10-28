import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buyerTitle } from '@/lib/format';
import { mockApi } from '@/test/mockApi';
import { renderWithQuery } from '@/test/render';
import { LaunchCard } from './LaunchCard';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ user: { access_token: 'test-token' } }),
}));

describe('запуск прогона по выбранным клиентам', () => {
  it('поиск по названию и ИНН, счётчик выбранных', async () => {
    const calls = mockApi({
      'GET /api/backend/runs/defaults': {
        dataDate: '2026-10-24',
        snapshotDate: '2026-10-20',
        clients: [
          { id: null, inn: '7710000001', name: 'ООО «Альфа-Трейд»' },
          { id: null, inn: '7710000002', name: 'АО «Бета»' },
          { id: null, inn: '0024194796', name: 'Клиент 0005' },
        ],
        runningRunId: null,
      },
      'POST /api/backend/runs': { runId: 9 },
    });
    renderWithQuery(<LaunchCard run={undefined} canOperate onStarted={() => {}} />);

    await userEvent.selectOptions(await screen.findByLabelText('Клиенты'), 'list');
    expect(screen.getByText('выбрано 0 из 3')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Поиск клиента'), '0024');
    expect(screen.queryByText('АО «Бета»')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText('выбрано 1 из 3')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Поиск клиента'));
    await userEvent.type(screen.getByLabelText('Поиск клиента'), 'бета');
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText('выбрано 2 из 3')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Запустить прогон' }));
    expect(calls.find((call) => call.method === 'POST')?.body).toMatchObject({ clientInns: ['0024194796', '7710000002'] });
  });

  it('покупатель без наименования - только ИНН, без повтора', () => {
    expect(buyerTitle({ name: 'ИНН 6673189463', inn: '6673189463' })).toBe('ИНН 6673189463');
    expect(buyerTitle({ name: null, inn: '6673189463' })).toBe('ИНН 6673189463');
    expect(buyerTitle({ name: 'ООО «Гамма»', inn: '7700000003' })).toBe('ООО «Гамма» · ИНН 7700000003');
  });
});
