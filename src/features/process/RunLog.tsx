import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { LOG_PAGE_SIZE, useRunLog } from '@/api/backend';
import { Button } from '@/components/ui/button';
import { dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const LEVELS = [
  { value: '', title: 'Все' },
  { value: 'WARN', title: 'Предупреждения' },
  { value: 'ERROR', title: 'Ошибки' },
];

/** ЭП-6: журнал прогона - события шагов, предупреждения, ошибки (НФР-7) */
export function RunLog({ runId, isRunning }: { runId: number; isRunning: boolean }) {
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(0);
  const log = useRunLog(runId, level, isRunning, page);
  const total = log.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / LOG_PAGE_SIZE));
  const from = total === 0 ? 0 : page * LOG_PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * LOG_PAGE_SIZE);

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex gap-1" role="group" aria-label="Уровень">
        {LEVELS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setLevel(item.value);
              setPage(0);
            }}
            className={cn(
              'rounded-md px-2 py-1 text-xs',
              level === item.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            {item.title}
          </button>
        ))}
      </div>
      <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto font-mono text-xs">
        {log.data?.items.map((entry) => (
          <li
            key={entry.id}
            className={cn(
              'grid grid-cols-[9rem_3rem_1fr] gap-2',
              entry.level === 'WARN' && 'text-amber-700 dark:text-amber-400',
              entry.level === 'ERROR' && 'text-destructive',
            )}
          >
            <span className="text-muted-foreground">{dateTime(entry.loggedAt)}</span>
            <span>{entry.stepNo ? `шаг ${entry.stepNo}` : ''}</span>
            <span>
              <span className="font-semibold">{entry.eventCode}</span> {entry.message}
            </span>
          </li>
        ))}
        {log.data?.items.length === 0 && <li className="text-muted-foreground">Записей нет</li>}
      </ul>
      {total > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            Записи {from.toLocaleString('ru-RU')}–{to.toLocaleString('ru-RU')} из {total.toLocaleString('ru-RU')}
          </span>
          {pages > 1 && (
            <>
              <Button
                className="ml-auto"
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                aria-label="Предыдущие записи журнала"
              >
                <ChevronLeft aria-hidden />
              </Button>
              <span>
                {page + 1} / {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= pages}
                onClick={() => setPage(page + 1)}
                aria-label="Следующие записи журнала"
              >
                <ChevronRight aria-hidden />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
