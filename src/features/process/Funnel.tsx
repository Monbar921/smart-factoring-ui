import { useFunnel } from '@/api/backend';
import { Skeleton } from '@/components/ui/skeleton';
import { REASONS, label, lowerFirst, money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Section } from './Section';

/**
 * ЭП-4: как открытые УПД сокращаются от шага к шагу - число на каждой ступени и причина отсева справа,
 * как на макете рис. 4 BRD. По ступени или причине открывается список УПД в детализации (ЭП-5).
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
  const stages = funnel.data ?? [];
  const total = stages[0]?.count || 1;

  return (
    <Section title="Воронка УПД" requirement="ЭП-4">
      {!enabled && <p className="text-sm text-muted-foreground">Воронка появится после завершения прогона.</p>}
      {enabled && funnel.isPending && <Skeleton className="h-48 w-full" />}
      <ul className="flex flex-col gap-2">
        {stages.map((stage, index) => {
          const first = index === 0;
          const last = index === stages.length - 1;
          const dropped = stage.dropped.reduce((sum, drop) => sum + drop.count, 0);
          return (
            <li
              key={stage.code}
              className="grid grid-cols-[minmax(9rem,14rem)_minmax(0,1fr)] items-center gap-x-3 lg:grid-cols-[15rem_minmax(0,1fr)_minmax(0,20rem)]"
            >
              <button
                type="button"
                onClick={() => onSelect(first ? {} : { stage: stage.code })}
                className={cn(
                  'truncate text-left text-sm hover:underline',
                  (first || last || selectedStage === stage.code) && 'font-semibold',
                )}
                title={stage.title}
              >
                {stage.title}
              </button>
              <button
                type="button"
                onClick={() => onSelect(first ? {} : { stage: stage.code })}
                className="group flex min-w-0 items-center gap-2"
                title={money(stage.amount)}
                aria-label={`${stage.title}: ${stage.count}`}
              >
                <span
                  className={cn(
                    'h-7 shrink-0 rounded-sm transition-opacity group-hover:opacity-80',
                    last ? 'bg-success' : 'bg-primary',
                  )}
                  style={{ width: `${Math.max(1.5, (stage.count / total) * 80)}%` }}
                />
                <span className="font-semibold tabular-nums">{stage.count.toLocaleString('ru-RU')}</span>
              </button>
              <span className="col-span-2 text-right text-sm text-amber-700 lg:col-span-1 dark:text-amber-400">
                {dropped > 0 && (
                  <>
                    −{dropped}{' '}
                    {stage.dropped.map((drop, i) => (
                      <span key={drop.reason}>
                        {i > 0 && ', '}
                        <button
                          type="button"
                          className="hover:underline"
                          onClick={() => onSelect({ stage: stage.code, reason: drop.reason })}
                          title={`${drop.count} УПД, ${money(drop.amount)}`}
                        >
                          {lowerFirst(label(REASONS, drop.reason))}
                          {stage.dropped.length > 1 && ` (${drop.count})`}
                        </button>
                      </span>
                    ))}
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {stages.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground italic">По ступени или причине открывается список УПД в детализации</p>
      )}
    </Section>
  );
}
