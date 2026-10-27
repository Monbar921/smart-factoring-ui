import { useState } from 'react';
import { useRunLog } from '@/api/backend';
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
  const log = useRunLog(runId, level, isRunning);

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex gap-1" role="group" aria-label="Уровень">
        {LEVELS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setLevel(item.value)}
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
    </div>
  );
}
