import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { type UpdFilter, useRun, useRuns } from '@/api/backend';
import type { Run } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Funnel } from '@/features/process/Funnel';
import { LaunchCard } from '@/features/process/LaunchCard';
import { ManualComparison } from '@/features/process/ManualComparison';
import { Portfolio } from '@/features/process/Portfolio';
import { RunJournal } from '@/features/process/RunJournal';
import { RunSteps } from '@/features/process/RunSteps';
import { Section } from '@/features/process/Section';
import { UpdTable } from '@/features/process/UpdTable';
import { openRun } from '@/lib/useHashRoute';

/**
 * Экран процесса (ЭП-1…ЭП-6, ЭП-9) по макету рис. 4 BRD: слева запуск и ход прогона по шагам,
 * справа воронка УПД, детализация и сравнение с ручной работой, внизу журнал и версии.
 * canOperate - роль operator: запуск прогона; без неё - только просмотр. viewOnly - гость: форма запуска видна,
 * кнопка неактивна (П4-1). runId - прогон из ссылки, иначе последний.
 */
export function ProcessPage({
  canOperate = true,
  viewOnly = false,
  runId: requested = null,
}: {
  canOperate?: boolean;
  viewOnly?: boolean;
  runId?: number | null;
}) {
  const runs = useRuns();
  const runId = requested ?? runs.data?.items[0]?.id ?? null;
  const run = useRun(runId);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
        <div className="flex flex-col gap-5">
          <LaunchCard run={run.data} canOperate={canOperate} viewOnly={viewOnly} onStarted={openRun} />
          {run.data && <RunSteps run={run.data} />}
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          {runId === null && runs.isSuccess && (
            <p className="text-muted-foreground">
              {canOperate
                ? 'Запустите анализ дебиторки или выберите запуск в истории запусков.'
                : 'Выберите запуск в истории запусков.'}
            </p>
          )}
          {runId !== null && run.isPending && <Skeleton className="h-64 w-full" />}
          {run.data && <RunResults key={run.data.id} run={run.data} />}
        </div>
      </div>
      {run.data && <RunJournal run={run.data} />}
      {run.data?.comparison && <ManualComparison comparison={run.data.comparison} />}
    </div>
  );
}

/**
 * Правая колонка: воронка, под ней портфель, детализация - свёрнутым блоком (П2-5.2): по умолчанию закрыта, шаг или
 * причина воронки раскрывают её с нужным списком. Фильтр свой у каждого прогона (key).
 */
function RunResults({ run }: { run: Run }) {
  const [filter, setFilter] = useState<UpdFilter>({ page: 0 });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const finished = run.status !== 'RUNNING';
  const toggle = (
    <Button variant="outline" size="sm" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((open) => !open)}>
      {detailsOpen ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
      {detailsOpen ? 'Свернуть' : 'Показать'}
    </Button>
  );

  return (
    <>
      <Funnel
        runId={run.id}
        enabled={finished && run.status !== 'STOPPED'}
        selectedStage={filter.stage ?? null}
        onSelect={(next) => {
          setFilter({ ...next, page: 0 });
          setDetailsOpen(true);
        }}
      />
      {finished && run.status !== 'STOPPED' && <Portfolio run={run} />}
      {detailsOpen ? (
        <UpdTable runId={run.id} enabled={finished} filter={filter} onFilter={setFilter} actions={toggle} />
      ) : (
        <Section title="Детализация по УПД" actions={toggle}>
          <p className="text-sm text-muted-foreground">
            Список УПД запуска с фильтрами и путём каждого УПД через шаги. Откройте его здесь или нажмите на шаг или причину в
            воронке.
          </p>
        </Section>
      )}
    </>
  );
}
