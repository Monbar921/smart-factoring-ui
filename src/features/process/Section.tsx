import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Блок экрана процесса как на макете рис. 4 BRD: заголовок слева, ссылка на требование (ЭП-n) справа */
export function Section({
  title,
  requirement,
  children,
  className,
}: {
  title: ReactNode;
  requirement: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('gap-3 py-4', className)}>
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 px-5">
        <CardTitle className="text-base font-semibold text-primary">{title}</CardTitle>
        <span className="shrink-0 text-xs text-muted-foreground">{requirement}</span>
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  );
}
