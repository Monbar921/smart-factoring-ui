import { useFunnel } from '@/api/backend';
import type { FunnelStage } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Section } from './Section';

/** Пояснения шагов воронки (Funnel_Screen_Requirements.md); названия шагов приходят из backend */
const STAGE_NOTES: Record<string, string> = {
  OPEN: 'Список после загрузки данных, с него всё начинается',
  CATEGORY_1_4: 'Просроченные счета в факторинг не берём',
  HAS_DATA: 'Мы знаем, кто покупатель, и можем оценить его надёжность',
  NO_STOP_FACTOR: 'Стоп-фактор: банкротство, ликвидация или исключение из реестра',
  HAS_HISTORY: 'По ней оцениваем, насколько вероятна задержка платежа',
  PASSED_RULES: 'Риск покупателя, доход банка, срок до оплаты и размер счёта',
  TOP_N: 'Менеджеру не показываем больше трёх предложений по одному клиенту',
  QUEUED: 'Итог после проверки лимита на покупателя',
};

const REMAINING_COLOR = '#2C63B0';
const RESULT_COLOR = '#12794A';

/**
 * Причины ухода: одна причина - один цвет на всех шагах; рядом с цветом всегда число и текст.
 * Причины, которых нет в документе (уже есть решение, ошибка оценки, просрочка 90+), - в том же стиле (решение 28.10).
 */
const REASON_STYLES: Record<string, { title: string; color: string; border?: string }> = {
  UPD_OVERDUE: { title: 'Счёт уже просрочен', color: '#9AA7B8' },
  ALREADY_DECIDED: { title: 'По счёту менеджер уже принял решение', color: '#CBD3DD' },
  NO_BUYER_DATA: { title: 'По покупателю нет данных', color: '#B3BDCA' },
  STOP_FACTOR: { title: 'У покупателя есть стоп-фактор', color: '#556171' },
  NO_PAYMENT_HISTORY: { title: 'Нет истории оплат', color: '#B3BDCA' },
  SCORING_ERROR: { title: 'Покупателя не удалось оценить', color: '#C7A9A9' },
  INCOME_BELOW_MIN: { title: 'Банку невыгодно: доход ниже минимума', color: '#E9B872' },
  RISK_LEVEL_D: { title: 'У покупателя уровень риска D: таким факторинг не предлагаем', color: '#B05A12' },
  DELAY_PROBABLE_LEVEL_C: { title: 'Уровень риска C и вероятна задержка оплаты', color: '#D8935A' },
  OVERDUE_90_PROBABLE: { title: 'Вероятна просрочка оплаты больше 90 дней', color: '#8F3B0C' },
  SHORT_TERM: { title: 'До оплаты осталось слишком мало дней', color: '#F2D9A8', border: '#D8B46A' },
  SMALL_AMOUNT: { title: 'Слишком маленький остаток по счёту', color: '#8A6A2F' },
  NOT_IN_TOP_N: { title: 'Не вошли в три лучших по клиенту', color: '#A9C4EC' },
  LIMIT_EXHAUSTED: { title: 'Лимит на покупателя уже исчерпан', color: '#7A4FA3' },
};

/** На последнем шаге та же причина «доход ниже минимума» - после уменьшения суммы до остатка лимита */
const QUEUED_TITLES: Record<string, string> = {
  INCOME_BELOW_MIN: 'После уменьшения суммы доход банка стал ниже минимума',
};

const MIN_SEGMENT_PX = 3;

function reasonStyle(stage: string, reason: string) {
  const style = REASON_STYLES[reason] ?? { title: reason, color: '#B3BDCA' };
  return stage === 'QUEUED' && QUEUED_TITLES[reason] ? { ...style, title: QUEUED_TITLES[reason] } : style;
}

/**
 * Воронка УПД по Funnel_Screen_Requirements.md (вариант А): сколько всего неоплаченных счетов, сколько можно предложить
 * клиентам и почему остальные отсеялись. По шагу или причине открывается список УПД в детализации.
 */
export function Funnel({
  runId,
  enabled,
  selectedStage,
  onSelect,
}: {
  runId: number;
  enabled: boolean;
  selectedStage: string | null;
  onSelect: (filter: { stage?: string; reason?: string }) => void;
}) {
  const funnel = useFunnel(runId, enabled);
  const stages = funnel.data ?? [];
  const total = stages[0]?.count ?? 0;
  const result = stages[stages.length - 1]?.count ?? 0;
  const share = total > 0 ? Math.round((result / total) * 100) : 0;

  return (
    <Section title="Воронка УПД">
      {!enabled && <p className="text-sm text-muted-foreground">Воронка появится после завершения анализа.</p>}
      {enabled && funnel.isPending && <Skeleton className="h-48 w-full" />}
      {stages.length > 0 && (
        <div className="mb-4 flex flex-col gap-1 text-sm">
          <p>
            Из <b>{total.toLocaleString('ru-RU')}</b> неоплаченных счетов <b>{result.toLocaleString('ru-RU')}</b> можно предложить
            клиентам. Ниже по шагам видно, где и почему остальные отсеялись.
          </p>
          <p className="text-xs text-muted-foreground">
            УПД — документ об отгрузке, по которому покупатель ещё должен заплатить.
          </p>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-0.5 size-3 shrink-0 rounded-sm" style={{ background: REMAINING_COLOR }} aria-hidden />
            <span>
              осталось после шага. Цветные части полосы — то, что ушло. Цвет показывает причину, и она одна и та же на всех шагах.
              Нажмите на причину, чтобы открыть список счетов.
            </span>
          </p>
        </div>
      )}
      <ol className="flex flex-col gap-4">
        {stages.map((stage, index) => (
          <StageRow
            key={stage.code}
            stage={stage}
            total={total}
            first={index === 0}
            last={index === stages.length - 1}
            selected={selectedStage === stage.code}
            onSelect={onSelect}
          />
        ))}
      </ol>
      {stages.length > 0 && (
        <p className="mt-4 text-sm">
          Итог: счетов, которые можно предложить клиентам, — <b>{result.toLocaleString('ru-RU')}</b>. Это {share}% от всех
          открытых счетов ({total.toLocaleString('ru-RU')}). Остальные отсеяны по причинам выше, каждую можно открыть списком.
        </p>
      )}
    </Section>
  );
}

function StageRow({
  stage,
  total,
  first,
  last,
  selected,
  onSelect,
}: {
  stage: FunnelStage;
  total: number;
  first: boolean;
  last: boolean;
  selected: boolean;
  onSelect: (filter: { stage?: string; reason?: string }) => void;
}) {
  const dropped = [...stage.dropped].filter((drop) => drop.count > 0).sort((a, b) => b.count - a.count);
  const droppedTotal = dropped.reduce((sum, drop) => sum + drop.count, 0);
  const width = (count: number) => (total > 0 ? `${(count / total) * 100}%` : '0%');
  const openStage = () => onSelect(first ? {} : { stage: stage.code });

  return (
    <li className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-1 lg:grid-cols-[13rem_minmax(0,1fr)_9.5rem]">
      <div className="min-w-0">
        <button
          type="button"
          onClick={openStage}
          className={cn('text-left text-sm font-medium hover:underline', selected && 'underline')}
        >
          {stage.title}
        </button>
        <p className="text-xs text-muted-foreground">{STAGE_NOTES[stage.code]}</p>
      </div>

      <div className="min-w-0">
        <button
          type="button"
          onClick={openStage}
          className="flex h-6 w-full overflow-hidden rounded-sm bg-muted"
          aria-label={`${stage.title}: осталось ${stage.count}${droppedTotal ? `, ушло ${droppedTotal}` : ''}`}
          title={`Осталось ${stage.count.toLocaleString('ru-RU')} счетов на ${money(stage.amount)}`}
        >
          <span
            className="h-full shrink-0"
            style={{ width: width(stage.count), background: last ? RESULT_COLOR : REMAINING_COLOR }}
          />
          {dropped.map((drop) => {
            const style = reasonStyle(stage.code, drop.reason);
            return (
              <span
                key={drop.reason}
                title={`${style.title}: ${drop.count.toLocaleString('ru-RU')}`}
                className="h-full shrink-0"
                style={{
                  width: width(drop.count),
                  minWidth: MIN_SEGMENT_PX,
                  background: style.color,
                  boxShadow: style.border ? `inset 0 0 0 1px ${style.border}` : undefined,
                }}
              />
            );
          })}
        </button>
        {dropped.length > 0 && (
          <ul className="mt-1 flex flex-col gap-0.5 text-xs">
            {dropped.map((drop) => {
              const style = reasonStyle(stage.code, drop.reason);
              return (
                <li key={drop.reason}>
                  <button
                    type="button"
                    className="flex items-start gap-2 text-left hover:underline"
                    onClick={() => onSelect({ stage: stage.code, reason: drop.reason })}
                    title={money(drop.amount)}
                  >
                    <span
                      className="mt-0.5 size-3 shrink-0 rounded-sm"
                      style={{ background: style.color, boxShadow: style.border ? `inset 0 0 0 1px ${style.border}` : undefined }}
                      aria-hidden
                    />
                    <span>
                      Ушло <b className="tabular-nums">{drop.count.toLocaleString('ru-RU')}</b> · {style.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="lg:text-right">
        <div className={cn('font-semibold tabular-nums', last ? 'text-3xl text-[#12794A]' : 'text-xl')}>
          {stage.count.toLocaleString('ru-RU')}
        </div>
        <div className="text-xs text-muted-foreground">
          {first ? 'счетов на входе' : last ? 'в очереди у менеджеров' : 'Осталось'}
        </div>
        {last && (
          <Button
            variant="outline"
            size="sm"
            className="mt-1 whitespace-nowrap"
            onClick={() => {
              window.location.hash = '#/crm';
            }}
          >
            Открыть очередь
          </Button>
        )}
      </div>
    </li>
  );
}
