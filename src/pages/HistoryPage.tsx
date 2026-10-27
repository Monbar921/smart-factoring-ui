import { DemoImportCard } from '@/features/process/LaunchCard';
import { RunHistory } from '@/features/process/RunHistory';
import { openRun } from '@/lib/useHashRoute';

/**
 * Вкладка «История прогонов» (ЭП-8) и загрузка демо-набора: импорт сбрасывает историю, поэтому он здесь, а не на экране процесса.
 * canOperate - роль operator: импорт демо-данных.
 */
export function HistoryPage({ canOperate }: { canOperate: boolean }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <RunHistory onSelect={openRun} />
      {canOperate && (
        <aside>
          <DemoImportCard />
        </aside>
      )}
    </div>
  );
}
