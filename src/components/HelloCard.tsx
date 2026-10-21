import { CircleAlert, CircleCheck, RefreshCw, Server } from 'lucide-react';
import { useHello } from '@/api/maintenance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Небольшое окно с ответом backend на GET /api/backend/maintenance/hello через gateway */
export function HelloCard() {
  const { data, error, isPending, isFetching, isError, refetch } = useHello();

  return (
    <Card className="w-full max-w-sm gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="size-4 text-muted-foreground" aria-hidden />
          Связь с backend
          <StatusBadge state={isPending ? 'pending' : isError ? 'error' : 'ok'} />
        </CardTitle>
        <CardDescription className="font-mono text-xs">GET /api/backend/maintenance/hello</CardDescription>
      </CardHeader>

      <CardContent className="px-5">
        <div
          className={cn(
            'flex min-h-24 items-center justify-center rounded-lg border bg-muted/50 p-4',
            isError && 'border-destructive/30 bg-destructive/5',
          )}
          aria-live="polite"
        >
          {isPending ? (
            <Skeleton className="h-8 w-32" />
          ) : isError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <CircleAlert className="size-4 shrink-0" aria-hidden />
              {error.message}
            </p>
          ) : (
            <p data-testid="hello-response" className="font-mono text-3xl font-semibold tracking-wider text-success">
              {data.message}
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="justify-between px-5 text-xs text-muted-foreground">
        <span>{data ? `${timeFormat.format(data.receivedAt)} · ${data.latencyMs} мс` : ' '}</span>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={cn(isFetching && 'animate-spin')} aria-hidden />
          Проверить
        </Button>
      </CardFooter>
    </Card>
  );
}

function StatusBadge({ state }: { state: 'pending' | 'ok' | 'error' }) {
  if (state === 'pending') {
    return (
      <Badge variant="secondary" className="ml-auto">
        Запрос…
      </Badge>
    );
  }
  if (state === 'error') {
    return (
      <Badge variant="destructive" className="ml-auto">
        <CircleAlert aria-hidden />
        Ошибка
      </Badge>
    );
  }
  return (
    <Badge className="ml-auto bg-success/15 text-success">
      <CircleCheck aria-hidden />
      На связи
    </Badge>
  );
}
