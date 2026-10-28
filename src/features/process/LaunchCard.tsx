import { useState } from 'react';
import { useRunDefaults, useStartRun } from '@/api/backend';
import type { Run } from '@/api/types';
import { ErrorNote } from '@/components/StatusBadges';
import { Button } from '@/components/ui/button';
import { RUN_STATUSES, duration, label } from '@/lib/format';
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
 * строка состояния показанного прогона. Без роли operator - только строка состояния.
 */
export function LaunchCard({
  run,
  canOperate,
  onStarted,
}: {
  run: Run | undefined;
  canOperate: boolean;
  onStarted: (runId: number) => void;
}) {
  const defaults = useRunDefaults();
  const start = useStartRun();
  const [chosenDate, setCalcDate] = useState('');
  const [allClients, setAllClients] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  // по умолчанию - последняя дата данных (ПР-9, ЭП-1)
  const calcDate = chosenDate || defaults.data?.dataDate || '';
  const clients = defaults.data?.clients ?? [];
  const needle = search.trim().toLowerCase();
  const shown = needle
    ? clients.filter((client) => (client.name ?? '').toLowerCase().includes(needle) || client.inn.includes(needle))
    : clients;

  const running = defaults.data?.runningRunId != null || start.isPending;
  const noData = defaults.isSuccess && !defaults.data.dataDate;

  const launch = () => {
    start.mutate(
      { clientInns: allClients ? null : selected, calcDate: calcDate || null },
      { onSuccess: (result) => onStarted(result.runId) },
    );
  };

  return (
    <Section title={canOperate ? 'Запуск прогона' : 'Прогон'} requirement="ЭП-1">
      {canOperate && (
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
                value={allClients ? 'all' : 'list'}
                onChange={(event) => setAllClients(event.target.value === 'all')}
              >
                <option value="all">все ({clients.length})</option>
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
            <Button
              size="lg"
              className="h-auto min-h-16 px-6 text-base"
              onClick={launch}
              disabled={running || noData || (!allClients && selected.length === 0)}
            >
              {running ? 'Прогон выполняется…' : 'Запустить прогон'}
            </Button>
          </div>

          {!allClients && (
            <div className="flex flex-col gap-2 rounded-md border p-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
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
            <p className="text-sm text-muted-foreground">Нет данных: загрузите выгрузку на вкладке «История прогонов».</p>
          )}
          <ErrorNote error={start.error} />
        </div>
      )}
      {run && (
        <p className={cn('text-sm font-semibold', canOperate && 'mt-3', STATUS_COLORS[run.status])}>
          Прогон № {run.id} · {label(RUN_STATUSES, run.status).toLowerCase()}
          {run.status === 'RUNNING' ? ` · шаг ${currentStep(run)} из ${run.steps.length}` : ` · ${duration(run.durationMs)}`}
        </p>
      )}
      {!run && !canOperate && <p className="text-sm text-muted-foreground">Прогонов ещё не было.</p>}
    </Section>
  );
}

function currentStep(run: Run): number {
  return run.steps.find((step) => step.status === 'RUNNING' || step.status === 'PENDING')?.stepNo ?? run.steps.length;
}
