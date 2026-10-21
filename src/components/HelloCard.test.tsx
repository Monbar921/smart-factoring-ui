import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockFetch, renderWithQuery } from '@/test/render';
import { HelloCard } from './HelloCard';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ user: { access_token: 'test-token' } }),
}));

describe('HelloCard', () => {
  it('показывает ответ backend и шлёт токен пользователя в gateway', async () => {
    const calls = mockFetch({ body: 'HELLO' });

    renderWithQuery(<HelloCard />);

    expect(await screen.findByTestId('hello-response')).toHaveTextContent('HELLO');
    expect(screen.getByText('На связи')).toBeInTheDocument();
    expect(calls[0]!.url).toBe('/api/backend/maintenance/hello');
    expect(new Headers(calls[0]!.init?.headers).get('Authorization')).toBe('Bearer test-token');
  });

  it('показывает ошибку, если gateway не принял токен, и даёт повторить запрос', async () => {
    const calls = mockFetch({ status: 401, body: '' }, { body: 'HELLO' });

    renderWithQuery(<HelloCard />);

    expect(await screen.findByText('Gateway не принял токен: войдите заново')).toBeInTheDocument();
    expect(screen.getByText('Ошибка')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Проверить' }));

    expect(await screen.findByTestId('hello-response')).toHaveTextContent('HELLO');
    expect(calls).toHaveLength(2);
  });
});
