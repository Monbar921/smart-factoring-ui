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

  // по умолчанию - последняя дата данных (ПР-9, ЭП-1)
  const calcDate = chosenDate || defaults.data?.dataDate || '';
  const clients = defaults.data?.clients ?? [];

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
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm">
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
              className="h-auto min-h-16 self-start px-6 text-base"
              onClick={launch}
              disabled={running || noData || (!allClients && selected.length === 0)}
            >
              {running ? 'Прогон выполняется…' : 'Запустить прогон'}
            </Button>
          </div>

          {!allClients && (
            <div className="max-h-48 overflow-y-auto rounded-md border p-2 text-sm">
              {clients.map((client) => (
                <label key={client.inn} className="flex items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
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
