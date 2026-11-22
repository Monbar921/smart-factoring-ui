import { useRef, useState } from 'react';
import { useRunDefaults, useStartRun } from '@/api/backend';
import { ApiError } from '@/api/client';
import type { Run } from '@/api/types';
import { GuestLock } from '@/components/GuestLock';
import { ErrorNote } from '@/components/StatusBadges';
import { Button } from '@/components/ui/button';
import { RUN_STATUSES, dateTime, duration, label, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Section } from './Section';

const INPUT =
  'h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none';

const STATUS_COLORS: Record<Run['status'], string> = {
  RUNNING: 'text-primary',
  DONE: 'text-success',
  DONE_WITH_WARNINGS: 'text-amber-700 dark:text-amber-400',
  STOPPED: 'text-destructive',
};

/**
 * ЭП-1: запуск прогона - набор клиентов и дата расчёта (по умолчанию последняя дата данных), под ними -
 * строка состояния показанного прогона. Без роли operator - только строка состояния; гостю (viewOnly) форма видна,
 * кнопка неактивна (П4-1).
 */
export function LaunchCard({
  run,
  canOperate,
  viewOnly = false,
  onStarted,
}: {
  run: Run | undefined;
  canOperate: boolean;
  viewOnly?: boolean;
  onStarted: (runId: number) => void;
}) {
  const defaults = useRunDefaults();
  const start = useStartRun();
  const [chosenDate, setCalcDate] = useState('');
  // все клиенты, по партиям (П1-1) или выбранные из списка
  const [mode, setMode] = useState<'all' | 'batches' | 'list'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [batchFilter, setBatchFilter] = useState('');
  const [search, setSearch] = useState('');

  // по умолчанию - последняя дата данных (ПР-9, ЭП-1)
  const calcDate = chosenDate || defaults.data?.dataDate || '';
  const clients = defaults.data?.clients ?? [];
  const batches = defaults.data?.batches ?? [];
  const inBatch = batchFilter ? new Set(batches.find((batch) => batch.batchId === batchFilter)?.clientInns ?? []) : null;
  const needle = search.trim().toLowerCase();
  const shown = clients
    .filter((client) => !inBatch || inBatch.has(client.inn))
    .filter((client) => !needle || (client.name ?? '').toLowerCase().includes(needle) || client.inn.includes(needle));
  const batchInns = batches.filter((batch) => selectedBatches.includes(batch.batchId)).flatMap((batch) => batch.clientInns);
  const clientInns = mode === 'all' ? null : mode === 'batches' ? batchInns : selected;

  const runningRunId = defaults.data?.runningRunId ?? null;
  const running = runningRunId !== null || start.isPending;
  const noData = defaults.isSuccess && !defaults.data.dataDate;
  const showForm = canOperate || viewOnly;
  // «Прогнать заново» после отказа «Эти данные уже прогнаны» (П4-3)
  const [confirmRepeat, setConfirmRepeat] = useState(false);
  // быстрый двойной клик: второй запуск не уходит, пока не вернулся первый (П4-5)
  const launching = useRef(false);

  const launch = (force = false) => {
    if (launching.current) return;
    launching.current = true;
    setConfirmRepeat(false);
    start.mutate(
      { clientInns, calcDate: calcDate || null, force },
      { onSuccess: (result) => onStarted(result.runId), onSettled: () => (launching.current = false) },
    );
  };
  const error = start.error instanceof ApiError ? start.error : null;
  const previousRunId = typeof error?.details?.runId === 'number' ? error.details.runId : null;

  return (
    <Section title={showForm ? 'Запуск анализа дебиторки' : 'Анализ дебиторки'}>
      {showForm && (
        <div className="flex flex-col gap-3">
          {/* поля не уже 16rem: если места не хватает, кнопка уходит под них, а не сжимает дату */}
          <div className="flex flex-wrap items-start gap-4">
            <div className="grid min-w-64 flex-1 grid-cols-[6.5rem_minmax(9.5rem,1fr)] items-center gap-x-3 gap-y-2 text-sm">
              <label htmlFor="launch-clients" className="text-muted-foreground">
                Клиенты
              </label>
              <select
                id="launch-clients"
                className={INPUT}
                value={mode}
                onChange={(event) => setMode(event.target.value as typeof mode)}
              >
                <option value="all">все ({clients.length})</option>
                {batches.length > 0 && <option value="batches">по партиям…</option>}
                <option value="list">выбрать из списка…</option>
              </select>
              <label htmlFor="launch-date" className="text-muted-foreground">
                Дата расчёта
              </label>
              <input
                id="launch-date"
                type="date"
                className={INPUT}
                value={calcDate}
                onChange={(event) => setCalcDate(event.target.value)}
                aria-label="Дата расчёта"
              />
              <span />
              <span className="text-xs text-muted-foreground italic">по умолчанию — последняя дата данных</span>
            </div>
            <div className="flex flex-col items-start gap-1">
              <GuestLock locked={viewOnly} text="Запуск анализа дебиторки доступен менеджеру">
                <Button
                  size="lg"
                  className="h-auto min-h-16 px-6 text-base"
                  onClick={() => launch()}
                  disabled={viewOnly || running || noData || (clientInns !== null && clientInns.length === 0)}
                >
                  Запустить анализ дебиторки
                </Button>
              </GuestLock>
              {running && (
                <p className="text-sm font-medium text-primary" role="status">
                  Идёт анализ дебиторки
                  {runningRunId !== null && (
                    <>
                      {': '}
                      <Button variant="link" className="h-auto p-0" onClick={() => onStarted(runningRunId)}>
                        запуск № {runningRunId}
                      </Button>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          {mode === 'batches' && (
            <fieldset className="flex flex-col gap-1 rounded-md border p-2 text-sm">
              <legend className="px-1 text-xs text-muted-foreground">
                Партии загруженных данных · выбрано клиентов {batchInns.length}
              </legend>
              {batches.map((batch) => (
                <label key={batch.batchId} className="flex items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
                    aria-label={`Партия ${batch.batchId}`}
                    checked={selectedBatches.includes(batch.batchId)}
                    onChange={(event) =>
                      setSelectedBatches((current) =>
                        event.target.checked ? [...current, batch.batchId] : current.filter((id) => id !== batch.batchId),
                      )
                    }
                  />
                  <span className="font-medium">{batch.batchId}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {plural(batch.clientInns.length, ['клиент', 'клиента', 'клиентов'])}
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={(event) => {
                      event.preventDefault();
                      setBatchFilter(batch.batchId);
                      setMode('list');
                    }}
                  >
                    клиенты партии
                  </Button>
                </label>
              ))}
            </fieldset>
          )}

          {mode === 'list' && (
            <div className="flex flex-col gap-2 rounded-md border p-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                {batches.length > 0 && (
                  <select
                    className={cn(INPUT, 'h-8 w-auto')}
                    value={batchFilter}
                    onChange={(event) => setBatchFilter(event.target.value)}
                    aria-label="Партия"
                  >
                    <option value="">все партии</option>
                    {batches.map((batch) => (
                      <option key={batch.batchId} value={batch.batchId}>
                        {batch.batchId}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="search"
                  className={cn(INPUT, 'h-8 min-w-48 flex-1')}
                  placeholder="Поиск по названию или ИНН"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Поиск клиента"
                />
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  выбрано {selected.length} из {clients.length}
                </span>
                {selected.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelected([])}>
                    Сбросить
                  </Button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto">
                {shown.map((client) => (
                  <label key={client.inn} className="flex items-center gap-2 py-0.5">
                    <input
                      type="checkbox"
                      aria-label={`${client.name ?? ''} ${client.inn}`.trim()}
                      checked={selected.includes(client.inn)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked ? [...current, client.inn] : current.filter((inn) => inn !== client.inn),
                        )
                      }
                    />
                    <span className="truncate">{client.name}</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">{client.inn}</span>
                  </label>
                ))}
                {shown.length === 0 && <p className="py-1 text-muted-foreground">Никого не нашлось</p>}
              </div>
            </div>
          )}
          {noData && (
            <p className="text-sm text-muted-foreground">Нет данных: загрузите выгрузку на вкладке «История запусков».</p>
          )}
          {error?.code === 'RUN_ALREADY_DONE' || error?.code === 'RUN_ALREADY_RUNNING' ? (
            <div className="flex flex-col gap-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm" role="alert">
              <p>
                {error.code === 'RUN_ALREADY_DONE'
                  ? `Эти данные уже проанализированы. Результат — запуск № ${previousRunId} от ${dateTime(String(error.details?.startedAt ?? ''))}.`
                  : `Анализ дебиторки уже идёт: запуск № ${previousRunId}.`}{' '}
                {previousRunId !== null && (
                  <Button variant="link" className="h-auto p-0" onClick={() => onStarted(previousRunId)}>
                    Открыть запуск № {previousRunId}
                  </Button>
                )}
              </p>
              {error.code === 'RUN_ALREADY_DONE' && !confirmRepeat && (
                <Button variant="outline" className="self-start" onClick={() => setConfirmRepeat(true)}>
                  Проанализировать заново
                </Button>
              )}
              {confirmRepeat && (
                <div className="flex flex-col gap-2" role="alertdialog">
                  <p>Проанализировать те же данные заново? Предложения в очереди обновятся, решения менеджеров сохранятся.</p>
                  <div className="flex gap-2">
                    <Button onClick={() => launch(true)} disabled={running}>
                      Да, проанализировать заново
                    </Button>
                    <Button variant="outline" onClick={() => setConfirmRepeat(false)}>
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <ErrorNote error={start.error} />
          )}
        </div>
      )}
      {run && (
        <p className={cn('text-sm font-semibold', showForm && 'mt-3', STATUS_COLORS[run.status])}>
          Запуск № {run.id} · {label(RUN_STATUSES, run.status).toLowerCase()}
          {run.status === 'RUNNING' ? ` · шаг ${currentStep(run)} из ${run.steps.length}` : ` · ${duration(run.durationMs)}`}
        </p>
      )}
      {!run && !showForm && <p className="text-sm text-muted-foreground">Запусков ещё не было.</p>}
    </Section>
  );
}

function currentStep(run: Run): number {
  return run.steps.find((step) => step.status === 'RUNNING' || step.status === 'PENDING')?.stepNo ?? run.steps.length;
}
