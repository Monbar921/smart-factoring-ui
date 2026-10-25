import { CircleAlert, CircleCheck, CircleDashed, CircleStop, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { RiskLevel, RunStatus, StepStatus } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { RUN_STATUSES, STEP_STATUSES } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  RUNNING: 'bg-primary/10 text-primary',
  DONE: 'bg-success/15 text-success',
  WARNING: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  DONE_WITH_WARNINGS: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  STOPPED: 'bg-destructive/10 text-destructive',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'RUNNING') return <LoaderCircle className="animate-spin" aria-hidden />;
  if (status === 'DONE') return <CircleCheck aria-hidden />;
  if (status === 'WARNING' || status === 'DONE_WITH_WARNINGS') return <TriangleAlert aria-hidden />;
  if (status === 'STOPPED') return <CircleStop aria-hidden />;
  return <CircleDashed aria-hidden />;
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <Badge className={cn(STATUS_STYLE[status])}>
      <StatusIcon status={status} />
      {RUN_STATUSES[status]}
    </Badge>
  );
}

export function StepStatusBadge({ status }: { status: StepStatus }) {
  return (
    <Badge className={cn(STATUS_STYLE[status])}>
      <StatusIcon status={status} />
      {STEP_STATUSES[status]}
    </Badge>
  );
}

const RISK_STYLE: Record<RiskLevel, string> = {
  A: 'bg-success/15 text-success',
  B: 'bg-primary/10 text-primary',
  C: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  D: 'bg-destructive/10 text-destructive',
};

export function RiskBadge({ level }: { level: RiskLevel | null }) {
  if (!level) return <span className="text-muted-foreground">—</span>;
  return <Badge className={cn('min-w-6 font-semibold', RISK_STYLE[level])}>{level}</Badge>;
}

export function ErrorNote({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      {error.message}
    </p>
  );
}
