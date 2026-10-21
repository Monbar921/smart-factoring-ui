import { Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Landmark className="size-5" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-semibold tracking-tight">Smart Factoring</span>
        <span className="block text-xs text-muted-foreground">Финансирование и взаиморасчёты</span>
      </span>
    </div>
  );
}
