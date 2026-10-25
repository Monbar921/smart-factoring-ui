import { useState } from 'react';
import { type UpdFilter, useRun, useRuns } from '@/api/backend';
import { Skeleton } from '@/components/ui/skeleton';
import { Funnel } from '@/features/process/Funnel';
import { DemoImportCard, LaunchCard } from '@/features/process/LaunchCard';
import { RunHistory } from '@/features/process/RunHistory';
import { RunLog } from '@/features/process/RunLog';
import { RunSteps } from '@/features/process/RunSteps';
import { UpdTable } from '@/features/process/UpdTable';

/**
 * Экран процесса (ЭП-1…ЭП-6, ЭП-8, ЭП-9): запуск, ход и результаты прогона по шагам.
 * canOperate - роль operator: запуск прогона и импорт демо-данных; без неё - только просмотр.
 */
export function ProcessPage({ canOperate = true }: { canOperate?: boolean }) {
  const runs = useRuns();
  const [selectedRunId, setRunId] = useState<number | null>(null);
  const [filter, setFilter] = useState<UpdFilter>({ page: 0 });
  // по умолчанию - последний прогон
  const runId = selectedRunId ?? runs.data?.items[0]?.id ?? null;
  const run = useRun(runId);

  const select = (id: number) => {
    setRunId(id);
    setFilter({ page: 0 });
  };
  const finished = run.data !== undefined && run.data.status !== 'RUNNING';

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <aside className="flex flex-col gap-6">
        {canOperate && <LaunchCard onStarted={select} />}
        <RunHistory selectedId={runId} onSelect={select} />
        {canOperate && <DemoImportCard />}
      </aside>
      <div className="flex min-w-0 flex-col gap-6">
        {runId === null && (
          <p className="text-muted-foreground">
            {canOperate ? 'Запустите прогон или выберите его в истории.' : 'Выберите прогон в истории.'}
          </p>
        )}
        {runId !== null && run.isPending && <Skeleton className="h-64 w-full" />}
        {run.data && (
          <>
            <RunSteps run={run.data} />
            <Funnel
              runId={run.data.id}
              enabled={finished && run.data.status !== 'STOPPED'}
              selectedStage={filter.stage ?? null}
              onSelect={(next) => setFilter({ ...next, page: 0 })}
            />
            <UpdTable runId={run.data.id} enabled={finished} filter={filter} onFilter={setFilter} />
            <RunLog runId={run.data.id} isRunning={!finished} />
          </>
        )}
      </div>
    </div>
  );
}
