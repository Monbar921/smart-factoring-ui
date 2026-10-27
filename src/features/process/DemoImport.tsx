import { Database, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { useImportDemo, useResetDemo } from '@/api/backend';
import type { ImportIssue, ImportResult } from '@/api/types';
import { ErrorNote } from '@/components/StatusBadges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';

const INPUT =
  'h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none';

const TABLES: Record<string, string> = {
  managers: 'Менеджеры',
  clients: 'Клиенты',
  buyers: 'Покупатели',
  buyerFinancials: 'Отчётность',
  contracts: 'Договоры',
  upds: 'УПД',
  payments: 'Платежи',
  egrulStatuses: 'ЕГРЮЛ',
  bankruptcyCases: 'Дела о банкротстве',
  efrsbEvents: 'События ЕФРСБ',
};

const LEVELS: Record<ImportIssue['level'], { title: string; className: string }> = {
  CONFLICT: { title: 'Пропущено', className: 'bg-destructive/10 text-destructive' },
  WARNING: { title: 'Внимание', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  DUPLICATE: { title: 'Возможный дубль', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  CHANGED: { title: 'Изменено', className: 'bg-primary/10 text-primary' },
};

const SHOWN_ISSUES = 50;

/**
 * Загрузка выгрузки генератора или партии ML-команды (Р-52, Р-54): дельта - новое добавляется, изменённое обновляется, ничего не удаляется,
 * история прогонов и решения менеджеров сохраняются. Итог - отчёт импорта.
 */
export function DemoImportCard() {
  const importDemo = useImportDemo();
  const [path, setPath] = useState('');

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="size-4 text-muted-foreground" aria-hidden />
          Загрузка данных
        </CardTitle>
        <CardDescription>
          Выгрузка генератора, партия ML-команды (batch_NN) или весь их набор с index.json — формат определяется сам. Новые записи
          добавляются, изменённые обновляются, ничего не удаляется. История прогонов и решения менеджеров сохраняются.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5 text-sm">
        <div className="flex gap-2">
          <input
            className={INPUT}
            placeholder="Папка выгрузки на сервере"
            value={path}
            onChange={(event) => setPath(event.target.value)}
            aria-label="Папка выгрузки на сервере"
          />
          <Button variant="outline" disabled={!path || importDemo.isPending} onClick={() => importDemo.mutate({ path })}>
            Импорт
          </Button>
        </div>
        <label className={cn('flex cursor-pointer items-center gap-2 text-primary', importDemo.isPending && 'opacity-50')}>
          <Upload className="size-4" aria-hidden />
          <span>{importDemo.isPending ? 'Загрузка…' : 'ZIP-архив выгрузки'}</span>
          <input
            type="file"
            accept=".zip"
            className="sr-only"
            disabled={importDemo.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importDemo.mutate({ file });
              event.target.value = '';
            }}
          />
        </label>
        <ErrorNote error={importDemo.error} />
        {importDemo.isSuccess && <ImportReport result={importDemo.data} />}
      </CardContent>
    </Card>
  );
}

function ImportReport({ result }: { result: ImportResult }) {
  const [all, setAll] = useState(false);
  const issues = all ? result.issues : result.issues.slice(0, SHOWN_ISSUES);
  const totalIssues = Object.values(result.issueCounts).reduce((sum, count) => sum + count, 0);

  return (
    <section className="flex flex-col gap-2" aria-label="Отчёт импорта">
      <p className="font-medium">
        Импорт № {result.batchId} · данные на {date(result.dataDate)}
      </p>
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead>Таблица</TableHead>
            <TableHead className="text-right">Строк</TableHead>
            <TableHead className="text-right">Новых</TableHead>
            <TableHead className="text-right">Изменено</TableHead>
            <TableHead className="text-right">Без изм.</TableHead>
            <TableHead className="text-right">Пропущено</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(result.tables).map(([table, stats]) => (
            <TableRow key={table}>
              <TableCell>{TABLES[table] ?? table}</TableCell>
              <TableCell className="text-right tabular-nums">{stats.rows}</TableCell>
              <TableCell className="text-right tabular-nums">{stats.inserted}</TableCell>
              <TableCell className="text-right tabular-nums">{stats.updated}</TableCell>
              <TableCell className="text-right tabular-nums">{stats.unchanged}</TableCell>
              <TableCell className={cn('text-right tabular-nums', stats.conflicts > 0 && 'font-semibold text-destructive')}>
                {stats.conflicts}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalIssues === 0 ? (
        <p className="text-success">Замечаний нет.</p>
      ) : (
        <>
          <p className="flex flex-wrap gap-1.5">
            {(Object.keys(LEVELS) as ImportIssue['level'][])
              .filter((level) => result.issueCounts[level])
              .map((level) => (
                <span key={level} className={cn('rounded-full px-2 py-0.5 text-xs', LEVELS[level].className)}>
                  {LEVELS[level].title}: {result.issueCounts[level]}
                </span>
              ))}
          </p>
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto text-xs">
            {issues.map((issue, index) => (
              <li key={index} className="rounded-md border px-2 py-1">
                <span className={cn('mr-1 rounded px-1', LEVELS[issue.level].className)}>{LEVELS[issue.level].title}</span>
                <span className="text-muted-foreground">
                  {issue.file}
                  {issue.line !== null ? `:${issue.line}` : ''}
                </span>{' '}
                {issue.key && <span className="font-medium">{issue.key}</span>} — {issue.message}
              </li>
            ))}
          </ul>
          {!all && result.issues.length > SHOWN_ISSUES && (
            <Button variant="link" size="sm" className="h-auto self-start px-0" onClick={() => setAll(true)}>
              Показать все ({result.issues.length})
            </Button>
          )}
          {totalIssues > result.issues.length && (
            <p className="text-xs text-muted-foreground">
              Показаны первые {result.issues.length} из {totalIssues} замечаний; полный отчёт — в demo_import_batch.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** Полная очистка: демо-данные, прогоны и решения менеджеров (параметры остаются) - отдельно от импорта */
export function DemoResetCard() {
  const reset = useResetDemo();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Card className="gap-3 border-destructive/40 py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trash2 className="size-4 text-destructive" aria-hidden />
          Очистка данных
        </CardTitle>
        <CardDescription>
          Удаляет все загруженные данные, историю прогонов и решения менеджеров — чтобы начать демо с нуля.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          Понимаю, что данные, прогоны и решения будут удалены
        </label>
        <Button
          variant="destructive"
          className="self-start"
          disabled={!confirmed || reset.isPending}
          onClick={() => reset.mutate(undefined, { onSuccess: () => setConfirmed(false) })}
        >
          Очистить все данные
        </Button>
        {reset.isSuccess && <p className="text-success">Данные очищены.</p>}
        <ErrorNote error={reset.error} />
      </CardContent>
    </Card>
  );
}
