import { DemoImportCard, DemoResetCard } from '@/features/process/DemoImport';
import { RunHistory } from '@/features/process/RunHistory';
import { openRun } from '@/lib/useHashRoute';

/**
 * Вкладка «История прогонов» (ЭП-8), загрузка данных (дельта, Р-52) и отдельная полная очистка.
 * canOperate - роль operator: импорт и очистка.
 */
export function HistoryPage({ canOperate }: { canOperate: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <RunHistory onSelect={openRun} />
      {canOperate && (
        <aside className="flex flex-col gap-5">
          <DemoImportCard />
          <DemoResetCard />
        </aside>
      )}
    </div>
  );
}
