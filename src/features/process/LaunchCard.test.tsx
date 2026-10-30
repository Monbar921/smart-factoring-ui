import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buyerTitle, updLabel } from '@/lib/format';
import { apiError, mockApi } from '@/test/mockApi';
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
    // у чекбокса есть имя - клиент и ИНН (доступность)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Клиент 0005 0024194796' }));
    expect(screen.getByText('выбрано 1 из 3')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Поиск клиента'));
    await userEvent.type(screen.getByLabelText('Поиск клиента'), 'бета');
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText('выбрано 2 из 3')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Запустить анализ дебиторки' }));
    expect(calls.find((call) => call.method === 'POST')?.body).toMatchObject({ clientInns: ['0024194796', '7710000002'] });
  });

  it('запуск по партиям: клиенты выбранных партий, переход к клиентам партии', async () => {
    const calls = mockApi({
      'GET /api/backend/runs/defaults': {
        dataDate: '2025-12-30',
        snapshotDate: '2025-12-30',
        clients: [
          { id: null, inn: '0024194796', name: 'Клиент 0005' },
          { id: null, inn: '0035326483', name: 'Клиент 0009' },
          { id: null, inn: '0101000001', name: 'Клиент 0101' },
        ],
        runningRunId: null,
        batches: [
          { batchId: 'batch_01', clientInns: ['0024194796', '0035326483'] },
          { batchId: 'batch_02', clientInns: ['0101000001'] },
        ],
      },
      'POST /api/backend/runs': { runId: 9 },
    });
    renderWithQuery(<LaunchCard run={undefined} canOperate onStarted={() => {}} />);

    await screen.findByRole('option', { name: 'по партиям…' });
    await userEvent.selectOptions(screen.getByLabelText('Клиенты'), 'batches');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Партия batch_01' }));
    expect(screen.getByText(/выбрано клиентов 2/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Запустить анализ дебиторки' }));
    expect(calls.find((call) => call.method === 'POST')?.body).toMatchObject({ clientInns: ['0024194796', '0035326483'] });

    // «клиенты партии» - список, отфильтрованный по партии
    await userEvent.click(screen.getAllByRole('button', { name: 'клиенты партии' })[1]!);
    expect(screen.getByLabelText('Партия')).toHaveValue('batch_02');
    expect(screen.getByRole('checkbox', { name: 'Клиент 0101 0101000001' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Клиент 0005/ })).not.toBeInTheDocument();
  });

  it('покупатель без наименования - только ИНН, без повтора', () => {
    expect(buyerTitle({ name: 'ИНН 6673189463', inn: '6673189463' })).toBe('ИНН 6673189463');
    expect(buyerTitle({ name: null, inn: '6673189463' })).toBe('ИНН 6673189463');
    expect(buyerTitle({ name: 'ООО «Гамма»', inn: '7700000003' })).toBe('ООО «Гамма», ИНН 7700000003');
  });

  it('номер УПД со словом «УПД» - без повтора', () => {
    expect(updLabel('U-1004')).toBe('УПД U-1004');
    expect(updLabel('УПД-0255')).toBe('УПД-0255');
  });
});

describe('повторный прогон и гость (П4-1, П4-3)', () => {
  const defaults = { dataDate: '2026-10-24', snapshotDate: '2026-10-20', clients: [], runningRunId: null };

  it('те же данные: сообщение со ссылкой на прежний прогон, «Прогнать заново» - с подтверждением', async () => {
    const opened: number[] = [];
    const calls = mockApi({
      'GET /api/backend/runs/defaults': defaults,
      'POST /api/backend/runs': (body: unknown) =>
        (body as { force?: boolean }).force
          ? { runId: 12 }
          : apiError(409, 'RUN_ALREADY_DONE', 'Эти данные уже проанализированы', {
              runId: 11,
              startedAt: '2026-10-30T09:15:00Z',
            }),
    });
    renderWithQuery(<LaunchCard run={undefined} canOperate onStarted={(id) => opened.push(id)} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Запустить анализ дебиторки' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Эти данные уже проанализированы. Результат — запуск № 11 от');
    await userEvent.click(screen.getByRole('button', { name: 'Открыть запуск № 11' }));
    expect(opened).toEqual([11]);

    await userEvent.click(screen.getByRole('button', { name: 'Проанализировать заново' }));
    await userEvent.click(screen.getByRole('button', { name: 'Да, проанализировать заново' }));
    expect(calls.filter((call) => call.method === 'POST').map((call) => (call.body as { force: boolean }).force)).toEqual([
      false,
      true,
    ]);
    expect(opened).toEqual([11, 12]);
  });

  it('гость видит форму, кнопка запуска неактивна, с подсказкой', async () => {
    const calls = mockApi({ 'GET /api/backend/runs/defaults': defaults });
    renderWithQuery(<LaunchCard run={undefined} canOperate={false} viewOnly onStarted={() => {}} />);

    const button = await screen.findByRole('button', { name: 'Запустить анализ дебиторки' });
    expect(button).toBeDisabled();
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Запуск анализа дебиторки доступен менеджеру');
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });
});
