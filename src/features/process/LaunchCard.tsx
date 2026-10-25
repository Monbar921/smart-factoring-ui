import { Database, Play, Upload } from 'lucide-react';
import { useState } from 'react';
import { useImportDemo, useRunDefaults, useStartRun } from '@/api/backend';
import { ErrorNote } from '@/components/StatusBadges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { date } from '@/lib/format';

const INPUT =
  'h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none';

/** ЭП-1: запуск прогона - набор клиентов и дата расчёта (по умолчанию последняя дата данных) */
export function LaunchCard({ onStarted }: { onStarted: (runId: number) => void }) {
  const defaults = useRunDefaults();
  const start = useStartRun();
  const [chosenDate, setCalcDate] = useState('');
  const [allClients, setAllClients] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  // по умолчанию - последняя дата данных (ПР-9, ЭП-1)
  const calcDate = chosenDate || defaults.data?.dataDate || '';

  const running = defaults.data?.runningRunId != null || start.isPending;
  const noData = defaults.isSuccess && !defaults.data.dataDate;

  const launch = () => {
    start.mutate(
      { clientInns: allClients ? null : selected, calcDate: calcDate || null },
      { onSuccess: (result) => onStarted(result.runId) },
    );
  };

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">Запуск прогона</CardTitle>
        <CardDescription>
          Дата данных {date(defaults.data?.dataDate)} · снимок внешних данных {date(defaults.data?.snapshotDate)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5">
        <label className="flex flex-col gap-1 text-sm">
          Дата расчёта
          <input
            type="date"
            className={INPUT}
            value={calcDate}
            onChange={(event) => setCalcDate(event.target.value)}
            aria-label="Дата расчёта"
          />
        </label>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1">Клиенты</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={allClients} onChange={(event) => setAllClients(event.target.checked)} />
            Все клиенты ({defaults.data?.clients.length ?? 0})
          </label>
          {!allClients && (
            <div className="max-h-48 overflow-y-auto rounded-md border p-2">
              {defaults.data?.clients.map((client) => (
                <label key={client.inn} className="flex items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={selected.includes(client.inn)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked ? [...current, client.inn] : current.filter((inn) => inn !== client.inn),
                      )
                    }
                  />
                  <span className="truncate">{client.name}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">{client.inn}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <Button onClick={launch} disabled={running || noData || (!allClients && selected.length === 0)}>
          <Play aria-hidden />
          {running ? 'Прогон выполняется…' : 'Запустить прогон'}
        </Button>
        {noData && <p className="text-sm text-muted-foreground">Нет данных: сначала загрузите демо-набор.</p>}
        <ErrorNote error={start.error} />
      </CardContent>
    </Card>
  );
}

/** Загрузка демо-набора: выгрузка генератора по пути на сервере или ZIP-архивом (Р-30) */
export function DemoImportCard() {
  const importDemo = useImportDemo();
  const [path, setPath] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="size-4 text-muted-foreground" aria-hidden />
          Демо-набор
        </CardTitle>
        <CardDescription>Импорт заменяет демо-данные и сбрасывает историю прогонов.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          Понимаю, что прогоны и решения будут удалены
        </label>
        <div className="flex gap-2">
          <input
            className={INPUT}
            placeholder="Папка выгрузки на сервере"
            value={path}
            onChange={(event) => setPath(event.target.value)}
            aria-label="Папка выгрузки на сервере"
          />
          <Button
            variant="outline"
            disabled={!confirmed || !path || importDemo.isPending}
            onClick={() => importDemo.mutate({ path })}
          >
            Импорт
          </Button>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-primary">
          <Upload className="size-4" aria-hidden />
          <span>ZIP-архив выгрузки</span>
          <input
            type="file"
            accept=".zip"
            className="sr-only"
            disabled={!confirmed || importDemo.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importDemo.mutate({ file });
              event.target.value = '';
            }}
          />
        </label>
        {importDemo.isSuccess && (
          <p className="text-success">
            Загружено:{' '}
            {Object.entries(importDemo.data.rowCounts)
              .map(([table, count]) => `${table} ${count}`)
              .join(', ')}
          </p>
        )}
        <ErrorNote error={importDemo.error} />
      </CardContent>
    </Card>
  );
}
