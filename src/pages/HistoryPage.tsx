import { ManualUploadCard, ManualUploadResetCard } from '@/features/process/ManualUpload';
import { RunAttempts, RunHistory } from '@/features/process/RunHistory';
import { openRun } from '@/lib/useHashRoute';

/**
 * Вкладка «История прогонов» (ЭП-8), загрузка данных (дельта, Р-52) и отдельная полная очистка.
 * canOperate - роль operator: импорт и очистка; viewOnly - гость: карточки видны, действия неактивны (П4-2).
 */
export function HistoryPage({ canOperate, viewOnly = false }: { canOperate: boolean; viewOnly?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <RunHistory onSelect={openRun} />
        <RunAttempts onSelect={openRun} />
      </div>
      {(canOperate || viewOnly) && (
        <aside className="flex flex-col gap-5">
          <ManualUploadCard locked={viewOnly} />
          <ManualUploadResetCard locked={viewOnly} />
        </aside>
      )}
    </div>
  );
}
