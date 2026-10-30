import { useRunAttempts, useRuns } from '@/api/backend';
import { RunStatusBadge } from '@/components/StatusBadges';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RUN_REJECT_REASONS, date, dateTime, duration, initiatorText, label, money } from '@/lib/format';
import { Section } from './Section';

/**
 * ЭП-8: история прогонов - время, кто запускал и с какой ролью (П4-6), статус, клиенты и УПД, длительность, предложения;
 * по строке - прогон на экране процесса
 */
export function RunHistory({ onSelect }: { onSelect: (runId: number) => void }) {
  const runs = useRuns();

  return (
    <Section title="История прогонов">
      {runs.data?.items.length === 0 && <p className="text-sm text-muted-foreground">Прогонов ещё не было.</p>}
      {runs.data && runs.data.items.length > 0 && (
        <Table>
          <TableHeader className="bg-primary/10">
            <TableRow>
              <TableHead>№</TableHead>
              <TableHead>Запуск</TableHead>
              <TableHead>Кто запускал</TableHead>
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
                <TableCell className="text-xs">{initiatorText(run.initiator, run.initiatorRole)}</TableCell>
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

/**
 * Попытки запуска прогона, и отклонённые (П4-6): кто, с какой ролью, чем кончилась. Запрос гостя на запуск отклоняет
 * gateway раньше backend - такие попытки видны в логе gateway.
 */
export function RunAttempts({ onSelect }: { onSelect: (runId: number) => void }) {
  const attempts = useRunAttempts();
  if (!attempts.data || attempts.data.items.length === 0) return null;

  return (
    <Section title="Попытки запуска">
      <Table>
        <TableHeader className="bg-primary/10">
          <TableRow>
            <TableHead>Когда</TableHead>
            <TableHead>Кто</TableHead>
            <TableHead>Итог</TableHead>
            <TableHead>Прогон</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attempts.data.items.map((attempt) => (
            <TableRow key={attempt.id}>
              <TableCell>{dateTime(attempt.attemptedAt)}</TableCell>
              <TableCell className="text-xs">{initiatorText(attempt.initiator, attempt.initiatorRole)}</TableCell>
              <TableCell className={attempt.outcome === 'REJECTED' ? 'text-destructive' : 'text-success'}>
                {attempt.outcome === 'STARTED'
                  ? 'запущен'
                  : `отклонён: ${attempt.reason ? label(RUN_REJECT_REASONS, attempt.reason) : (attempt.message ?? '')}`}
              </TableCell>
              <TableCell>
                {attempt.runId !== null && (
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onSelect(attempt.runId!)}>
                    № {attempt.runId}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
}
