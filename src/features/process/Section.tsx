import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Блок экрана процесса как на макете рис. 4 BRD: заголовок и содержимое (теги требований ЭП-n на экране не показываются) */
export function Section({
  title,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  /** элементы справа от заголовка (например, кнопка раскрытия) */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('gap-3 py-4', className)}>
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 px-5">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  );
}
