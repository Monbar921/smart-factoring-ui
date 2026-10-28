import { useState } from 'react';
import { useRunLog } from '@/api/backend';
import type { Run } from '@/api/types';
import { Button } from '@/components/ui/button';
import { date, time } from '@/lib/format';
import { RunLog } from './RunLog';
import { Section } from './Section';

const MODEL_TITLES: Record<string, string> = { pd: 'модель PD', delay: 'модель задержки', llm: 'LLM' };

/**
 * ЭП-6: журнал и версии, как на макете рис. 4 BRD: строка хода прогона, версии моделей и даты (НФР-6, НФР-7),
 * под ними - полный журнал с фильтром по уровню.
 */
export function RunJournal({ run }: { run: Run }) {
  const [expanded, setExpanded] = useState(false);
  const running = run.status === 'RUNNING';
  const errors = useRunLog(run.id, 'ERROR', running);

  const timeline = [
    `${time(run.startedAt)} запуск прогона № ${run.id} (${run.initiator})`,
    ...run.steps.filter((step) => step.finishedAt).map((step) => `${time(step.finishedAt)} шаг ${step.stepNo} готов`),
    ...(run.finishedAt ? [`прогон ${run.status === 'STOPPED' ? 'остановлен' : 'выполнен'}`] : []),
  ];
  const order = Object.keys(MODEL_TITLES);
  const versions = Object.entries(run.modelVersions ?? {})
    .sort(([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
    .map(([name, version]) => `${MODEL_TITLES[name] ?? name} ${version}`);

  return (
    <Section title="Журнал и версии">
      <p className="text-sm">{timeline.join(' · ')}</p>
      <p className="mt-2 text-sm">
        Версии: {[...versions, `дата данных ${date(run.dataDate)}`, `дата расчёта ${date(run.calcDate)}`].join(' · ')} · ошибок
        обработки: {errors.data?.total ?? '—'}
      </p>
      <Button variant="link" size="sm" className="mt-1 h-auto px-0" onClick={() => setExpanded((value) => !value)}>
        {expanded ? 'Скрыть журнал' : 'Весь журнал прогона'}
      </Button>
      {expanded && <RunLog runId={run.id} isRunning={running} />}
    </Section>
  );
}
