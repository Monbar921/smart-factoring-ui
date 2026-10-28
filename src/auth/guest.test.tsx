import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '@/test/mockApi';
import { LoginPage } from '@/pages/LoginPage';
import { stopGuest, useAccessToken } from './guest';

vi.mock('@/config', () => ({
  config: { keycloakUrl: 'http://kc', keycloakRealm: 'r', keycloakClientId: 'c', guestLogin: true },
}));
vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false, signinRedirect: vi.fn() }),
}));

function TokenProbe() {
  return <span data-testid="token">{useAccessToken() ?? 'нет'}</span>;
}

describe('гостевой вход «Запуск демо»', () => {
  afterEach(() => stopGuest());

  it('токен демо-пользователя выдаёт gateway, пароль не нужен', async () => {
    const calls = mockApi({ 'POST /api/guest/session': { accessToken: 'guest-token', expiresIn: 900 } });
    render(
      <>
        <LoginPage />
        <TokenProbe />
      </>,
    );
    expect(screen.getByTestId('token')).toHaveTextContent('нет');

    await userEvent.click(screen.getByRole('button', { name: 'Запуск демо' }));

    expect(await screen.findByText('guest-token')).toBeInTheDocument();
    expect(calls).toEqual([expect.objectContaining({ method: 'POST', url: '/api/guest/session', body: undefined })]);
    expect(sessionStorage.getItem('guest-session')).toContain('guest-token');

    stopGuest();
    expect(await screen.findByText('нет')).toBeInTheDocument();
  });

  it('гостевой вход выключен на стенде - понятная ошибка', async () => {
    mockApi({});
    render(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Запуск демо' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Гостевой вход на этом стенде выключен');
  });
});
