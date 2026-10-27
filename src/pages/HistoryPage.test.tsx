import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImportResult } from '@/api/types';
import { mockApi } from '@/test/mockApi';
import { renderWithQuery } from '@/test/render';
import { HistoryPage } from './HistoryPage';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ user: { access_token: 'test-token' } }),
}));

const RESULT: ImportResult = {
  batchId: 3,
  dataDate: '2026-10-30',
  snapshotDate: '2026-10-20',
  rowCounts: { upds: 2, payments: 2 },
  tables: {
    upds: { rows: 2, inserted: 1, updated: 1, unchanged: 0, conflicts: 0 },
    payments: { rows: 2, inserted: 1, updated: 0, unchanged: 0, conflicts: 1 },
  },
  issueCounts: { CONFLICT: 1, CHANGED: 1 },
  issues: [
    {
      level: 'CONFLICT',
      file: 'payments.csv',
      line: 2,
      key: 'P-0001',
      message: 'уже загружено с другими значениями: amount 3000000.00 → 3100000.00 - строка пропущена',
    },
    { level: 'CHANGED', file: 'upds.csv', line: 3, key: 'U-1003', message: 'изменено: amount 6000000.00 → 6500000.00' },
  ],
};

function routes() {
  return {
    'GET /api/backend/runs': { items: [], page: 0, size: 50, total: 0 },
    'POST /api/backend/manual-upload': RESULT,
    'DELETE /api/backend/manual-upload/data': {},
  };
}

describe('HistoryPage', () => {
  it('импорт без подтверждения и с отчётом: новые, изменённые, пропущенные строки и замечания', async () => {
    const calls = mockApi(routes());
    renderWithQuery(<HistoryPage canOperate />);

    await userEvent.type(screen.getByLabelText('Папка выгрузки на сервере'), 'delta-1');
    await userEvent.click(screen.getByRole('button', { name: 'Импорт' }));

    expect(await screen.findByText('Импорт № 3 · данные на 30.10.2026')).toBeInTheDocument();
    expect(screen.getByText('Пропущено: 1')).toBeInTheDocument();
    expect(screen.getByText(/amount 3000000.00 → 3100000.00/)).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({ path: 'delta-1' });
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false);
  });

  it('очистка данных - отдельно и только с подтверждением', async () => {
    const calls = mockApi(routes());
    renderWithQuery(<HistoryPage canOperate />);

    const button = screen.getByRole('button', { name: 'Очистить все данные' });
    expect(button).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Понимаю, что данные, прогоны и решения будут удалены'));
    await userEvent.click(button);

    expect(await screen.findByText('Данные очищены.')).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'DELETE' && call.url === '/api/backend/manual-upload/data')).toBe(true);
  });

  it('без роли operator - только история', () => {
    mockApi(routes());
    renderWithQuery(<HistoryPage canOperate={false} />);

    expect(screen.queryByText('Ручная загрузка')).not.toBeInTheDocument();
    expect(screen.queryByText('Очистка данных')).not.toBeInTheDocument();
  });
});
