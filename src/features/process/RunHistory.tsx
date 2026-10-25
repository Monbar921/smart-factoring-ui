import { useRuns } from '@/api/backend';
import { RunStatusBadge } from '@/components/StatusBadges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { date, dateTime, duration, money } from '@/lib/format';
import { cn } from '@/lib/utils';

/** ЭП-8: история прогонов - время, статус, клиенты и УПД, длительность, предложения */
export function RunHistory({ selectedId, onSelect }: { selectedId: number | null; onSelect: (runId: number) => void }) {
  const runs = useRuns();

  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">История прогонов</CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        {runs.data?.items.length === 0 && <p className="px-3 text-sm text-muted-foreground">Прогонов ещё не было.</p>}
        <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
          {runs.data?.items.map((run) => (
            <li key={run.id}>
              <button
                type="button"
                onClick={() => onSelect(run.id)}
                className={cn(
                  'flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left text-sm hover:bg-muted',
                  run.id === selectedId && 'bg-muted',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">№ {run.id}</span>
                  <RunStatusBadge status={run.status} />
                </span>
                <span className="text-xs text-muted-foreground">
                  {dateTime(run.startedAt)} · расчёт на {date(run.calcDate)} · {duration(run.durationMs)}
                </span>
                {run.offerCount !== null && (
                  <span className="text-xs text-muted-foreground">
                    клиентов {run.clientCount ?? '—'} · УПД {run.openUpdCount ?? '—'} · предложений {run.offerCount} ·{' '}
                    {money(run.eadTotal)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
