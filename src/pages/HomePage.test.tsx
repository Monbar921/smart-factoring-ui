import { screen } from '@testing-library/react';
import { mockApi } from '@/test/mockApi';
import { renderWithQuery } from '@/test/render';
import { testToken } from '@/test/token';
import { HomePage } from './HomePage';

let accessToken = testToken();

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ user: { access_token: accessToken, profile: { preferred_username: 'tester' } } }),
}));

function routes() {
  return {
    'GET /api/backend/runs/defaults': { dataDate: '2026-10-24', snapshotDate: '2026-10-20', clients: [], runningRunId: null },
    'GET /api/backend/runs': { items: [], page: 0, size: 50, total: 0 },
    'GET /api/backend/managers': [],
  };
}

describe('HomePage', () => {
  beforeEach(() => {
    mockApi(routes());
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('оператору - экран процесса с запуском, без эмулятора CRM даже по ссылке', async () => {
    accessToken = testToken('operator');
    window.location.hash = '#/crm';

    renderWithQuery(<HomePage />);

    expect(await screen.findByText('Запуск анализа дебиторки')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Анализ дебиторки' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Эмулятор CRM' })).not.toBeInTheDocument();
  });

  it('менеджеру - эмулятор CRM и экран процесса только для просмотра', async () => {
    accessToken = testToken('manager');

    renderWithQuery(<HomePage />);

    expect(await screen.findByText('Выберите запуск в истории запусков.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Эмулятор CRM' })).toBeInTheDocument();
    expect(screen.queryByText('Запуск анализа дебиторки')).not.toBeInTheDocument();
  });

  it('без ролей - сообщение «Нет доступа»', () => {
    accessToken = testToken('user');

    renderWithQuery(<HomePage />);

    expect(screen.getByText('Нет доступа')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Анализ дебиторки' })).not.toBeInTheDocument();
  });
});
