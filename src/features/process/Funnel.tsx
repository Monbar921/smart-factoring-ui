import { useFunnel } from '@/api/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { REASONS, label, money } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * ЭП-4: как открытые УПД сокращаются от шага к шагу. По ступени или причине отсева открывается список УПД (ЭП-5).
 */
export function Funnel({
  runId,
  enabled,
  selectedStage,
  onSelect,
}: {
  runId: number;
  enabled: boolean;
  selectedStage: string | null;
  onSelect: (filter: { stage?: string; reason?: string }) => void;
}) {
  const funnel = useFunnel(runId, enabled);
  const total = funnel.data?.[0]?.count || 1;

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">Воронка УПД</CardTitle>
        <CardDescription>Нажмите на ступень или причину, чтобы открыть список УПД</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-5">
        {!enabled && <p className="text-sm text-muted-foreground">Воронка появится после завершения прогона.</p>}
        {enabled && funnel.isPending && <Skeleton className="h-48 w-full" />}
        {funnel.data?.map((stage) => (
          <div key={stage.code} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => onSelect(stage.code === 'OPEN' ? {} : { stage: stage.code })}
              className={cn('group flex items-center gap-3 text-left text-sm', selectedStage === stage.code && 'font-semibold')}
            >
              <span className="w-56 shrink-0 truncate">{stage.title}</span>
              <span className="relative h-6 flex-1 overflow-hidden rounded bg-muted">
                <span
                  className="absolute inset-y-0 left-0 rounded bg-primary/70 transition-[width] group-hover:bg-primary"
                  style={{ width: `${Math.max(2, (stage.count / total) * 100)}%` }}
                />
              </span>
              <span className="w-12 text-right font-medium tabular-nums">{stage.count}</span>
              <span className="w-32 text-right text-xs text-muted-foreground tabular-nums">{money(stage.amount)}</span>
            </button>
            {stage.dropped.length > 0 && (
              <ul className="ml-56 flex flex-wrap gap-1 pl-3">
                {stage.dropped.map((drop) => (
                  <li key={drop.reason}>
                    <button
                      type="button"
                      onClick={() => onSelect({ stage: stage.code, reason: drop.reason })}
                      className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      − {drop.count} · {label(REASONS, drop.reason)} · {money(drop.amount)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
