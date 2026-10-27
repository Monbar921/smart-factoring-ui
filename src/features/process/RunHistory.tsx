import { useRuns } from '@/api/backend';
import { RunStatusBadge } from '@/components/StatusBadges';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { date, dateTime, duration, money } from '@/lib/format';
import { Section } from './Section';

/** ЭП-8: история прогонов - время, статус, клиенты и УПД, длительность, предложения; по строке - прогон на экране процесса */
export function RunHistory({ onSelect }: { onSelect: (runId: number) => void }) {
  const runs = useRuns();

  return (
    <Section title="История прогонов" requirement="ЭП-8">
      {runs.data?.items.length === 0 && <p className="text-sm text-muted-foreground">Прогонов ещё не было.</p>}
      {runs.data && runs.data.items.length > 0 && (
        <Table>
          <TableHeader className="bg-primary/10">
            <TableRow>
              <TableHead>№</TableHead>
              <TableHead>Запуск</TableHead>
              <TableHead>Дата расчёта</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Клиентов</TableHead>
              <TableHead className="text-right">Открытых УПД</TableHead>
              <TableHead className="text-right">Предложений</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead className="text-right">Длительность</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.data.items.map((run) => (
              <TableRow key={run.id} className="cursor-pointer" onClick={() => onSelect(run.id)}>
                <TableCell className="font-medium">№ {run.id}</TableCell>
                <TableCell>{dateTime(run.startedAt)}</TableCell>
                <TableCell>{date(run.calcDate)}</TableCell>
                <TableCell>
                  <RunStatusBadge status={run.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{run.clientCount ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{run.openUpdCount ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{run.offerCount ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{money(run.eadTotal)}</TableCell>
                <TableCell className="text-right tabular-nums">{duration(run.durationMs)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="mt-2 text-xs text-muted-foreground italic">По строке открывается прогон на вкладке «Прогон»</p>
    </Section>
  );
}
