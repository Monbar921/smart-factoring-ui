import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useEfrsbEvent, useRiskBuyers } from '@/api/backend';
import type { EfrsbEventKind } from '@/api/types';
import { ErrorNote } from '@/components/StatusBadges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buyerTitle, money } from '@/lib/format';

const INPUT =
  'h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none';

const KINDS: { kind: EfrsbEventKind; title: string }[] = [
  { kind: 'OBSERVATION', title: 'Введено наблюдение (банкротство)' },
  { kind: 'BANKRUPT', title: 'Признан банкротом, конкурсное производство' },
  { kind: 'LIQUIDATION', title: 'Принято решение о ликвидации (ЕГРЮЛ)' },
  { kind: 'INTENT', title: 'Намерение кредитора подать на банкротство (не стоп-фактор)' },
];

/**
 * Имитация подписки на мониторинг контрагентов (Р-86): событие ЕФРСБ по покупателю между прогонами. Стоп-фактор
 * сразу отзывает предложения покупателя, шлёт сигнал в риск и уведомляет менеджера - не дожидаясь ночного анализа.
 */
export function EfrsbEventCard() {
  const buyers = useRiskBuyers(true);
  const send = useEfrsbEvent();
  const [buyerInn, setBuyerInn] = useState('');
  const [kind, setKind] = useState<EfrsbEventKind>('OBSERVATION');
  const items = buyers.data ?? [];
  const selected = buyerInn || items[0]?.inn || '';

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="size-4 text-destructive" aria-hidden />
          Событие ЕФРСБ
        </CardTitle>
        <CardDescription>
          Имитация подписки на мониторинг покупателей. Стоп-фактор сразу отзывает предложения покупателя, отправляет сигнал в
          риск-подразделение и уведомляет менеджера; событие учтёт и следующий анализ.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5 text-sm">
        {buyers.isSuccess && items.length === 0 ? (
          <p className="text-muted-foreground">Нет покупателей с действующими предложениями — сначала запустите анализ.</p>
        ) : (
          <>
            <select
              className={INPUT}
              value={selected}
              onChange={(event) => setBuyerInn(event.target.value)}
              aria-label="Покупатель"
            >
              {items.map((buyer) => (
                <option key={buyer.inn} value={buyer.inn}>
                  {buyerTitle(buyer)} · в очереди {buyer.queuedOffers} на {money(buyer.queuedEad)}
                  {buyer.transferredOffers > 0 ? ` · передано ${buyer.transferredOffers}` : ''}
                </option>
              ))}
            </select>
            <select
              className={INPUT}
              value={kind}
              onChange={(event) => setKind(event.target.value as EfrsbEventKind)}
              aria-label="Событие"
            >
              {KINDS.map((item) => (
                <option key={item.kind} value={item.kind}>
                  {item.title}
                </option>
              ))}
            </select>
            <div>
              <Button
                variant="destructive"
                disabled={!selected || send.isPending}
                onClick={() => send.mutate({ buyerInn: selected, kind })}
              >
                Отправить событие
              </Button>
            </div>
          </>
        )}
        {send.data && (
          <p role="status" className={send.data.stopFactor ? 'font-medium text-destructive' : 'text-muted-foreground'}>
            {buyerTitle(send.data.buyer)}: {send.data.message}
          </p>
        )}
        <ErrorNote error={send.error ?? buyers.error} />
      </CardContent>
    </Card>
  );
}
