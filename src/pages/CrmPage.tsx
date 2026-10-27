import { Bell, Check, Copy, Send, ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';
import { useClientCard, useManagers, useNotifications, useOfferDecision, useQueue } from '@/api/backend';
import type { Offer } from '@/api/types';
import { ErrorNote, RiskBadge } from '@/components/StatusBadges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NOTIFICATION_TYPES, REASONS, date, dateTime, label, money, percent } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Эмулятор CRM (ЭП-7): очередь предложений и карточка клиента так, как их получает CRM по API (п. 5.5) */
export function CrmPage() {
  const managers = useManagers();
  const [selectedManagerId, setManagerId] = useState<number | null>(null);
  const [offerId, setOfferId] = useState<number | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  // в демо один менеджер (Р-17): по умолчанию - первый из списка
  const managerId = selectedManagerId ?? managers.data?.[0]?.id ?? null;
  const queue = useQueue(managerId);

  const offer = queue.data?.find((item) => item.offerId === offerId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Менеджер
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={managerId ?? ''}
            onChange={(event) => {
              setManagerId(Number(event.target.value));
              setOfferId(null);
              setClientId(null);
            }}
          >
            {managers.data?.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.fullName}
              </option>
            ))}
          </select>
        </label>
        {managers.data?.length === 0 && <span className="text-sm text-muted-foreground">Менеджеров нет: запустите прогон.</span>}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="gap-3 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-base">Очередь предложений</CardTitle>
              <CardDescription>По убыванию ранга: TR × доход банка (п. 5.3)</CardDescription>
            </CardHeader>
            <CardContent className="px-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Клиент</TableHead>
                    <TableHead>УПД и покупатель</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                    <TableHead className="text-right">Срок</TableHead>
                    <TableHead>Риск</TableHead>
                    <TableHead>Пометки</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.data?.map((item) => (
                    <TableRow
                      key={item.offerId}
                      className={cn('cursor-pointer', item.offerId === offerId && 'bg-muted')}
                      onClick={() => {
                        setOfferId(item.offerId);
                        setClientId(item.client.id);
                      }}
                    >
                      <TableCell className="max-w-44 truncate">{item.client.name}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.updNumber}</div>
                        <div className="max-w-56 truncate text-xs text-muted-foreground">{item.buyer.name}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{money(item.ead)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div>{money(item.price)}</div>
                        <div className="text-xs text-muted-foreground">{percent(item.priceRate)} год.</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.termDays} дн.</TableCell>
                      <TableCell>
                        <RiskBadge level={item.riskLevel} />
                      </TableCell>
                      <TableCell>
                        <OfferFlags offer={item} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(managers.isPending || (managerId !== null && queue.isPending)) && (
                <div className="flex flex-col gap-2 px-2 py-3" role="status" aria-label="Загрузка очереди">
                  {[0, 1, 2].map((row) => (
                    <Skeleton key={row} className="h-9 w-full" />
                  ))}
                </div>
              )}
              {queue.data?.length === 0 && <p className="px-2 py-4 text-sm text-muted-foreground">Очередь пуста.</p>}
            </CardContent>
          </Card>
          {clientId !== null && <ClientCardView clientId={clientId} onSelectOffer={setOfferId} />}
        </div>

        <aside className="flex flex-col gap-6">
          {offer ? <OfferCard offer={offer} onDone={() => setOfferId(null)} /> : <OfferHint />}
          <Notifications managerId={managerId} />
        </aside>
      </div>
    </div>
  );
}

function OfferFlags({ offer }: { offer: Offer }) {
  return (
    <div className="flex flex-wrap gap-1">
      {offer.flags.isNew && <Badge className="bg-primary/10 text-primary">новое</Badge>}
      {offer.flags.delayProbable && <Badge variant="outline">вероятна задержка</Badge>}
      {offer.flags.lowData && <Badge variant="outline">мало данных</Badge>}
      {offer.flags.reducedToLimit && <Badge variant="outline">до остатка лимита</Badge>}
    </div>
  );
}

function OfferHint() {
  return (
    <Card className="py-5">
      <CardContent className="px-5 text-sm text-muted-foreground">
        Выберите предложение в очереди, чтобы открыть карточку.
      </CardContent>
    </Card>
  );
}

/** Карточка предложения (п. 5.3, пункт 4) и решение менеджера (блок 6) */
function OfferCard({ offer, onDone }: { offer: Offer; onDone: () => void }) {
  const decision = useOfferDecision();
  const [copied, setCopied] = useState(false);

  const decide = (action: 'transfer' | 'reject') =>
    decision.mutate({ offerId: offer.offerId, action }, { onSuccess: () => onDone() });

  return (
    <Card className="gap-4 py-5" aria-label="Карточка предложения">
      <CardHeader className="px-5">
        <CardTitle className="text-base">
          {offer.client.name}: УПД {offer.updNumber} от {date(offer.updDate)}
        </CardTitle>
        <CardDescription>
          Покупатель {offer.buyer.name} · ИНН {offer.buyer.inn}
        </CardDescription>
        <OfferFlags offer={offer} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 text-sm">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          <dt className="text-muted-foreground">Сумма финансирования</dt>
          <dd className="text-right font-semibold tabular-nums">{money(offer.ead)}</dd>
          <dt className="text-muted-foreground">Цена</dt>
          <dd className="text-right tabular-nums">
            {money(offer.price)} · {percent(offer.priceRate)} год.
          </dd>
          <dt className="text-muted-foreground">Срок</dt>
          <dd className="text-right tabular-nums">{offer.termDays} дн.</dd>
          <dt className="text-muted-foreground">Уровень риска · PD</dt>
          <dd className="flex items-center justify-end gap-2 tabular-nums">
            <RiskBadge level={offer.riskLevel} /> {percent(offer.pd)}
          </dd>
          <dt className="text-muted-foreground">EL · доход банка</dt>
          <dd className="text-right tabular-nums">
            {money(offer.el)} · {money(offer.income)}
          </dd>
        </dl>

        <section>
          <h4 className="mb-1 font-medium">Причины оценки</h4>
          {offer.reasonsText && <p className="mb-2">{offer.reasonsText}</p>}
          <ul className="flex flex-col gap-1 text-xs">
            {offer.reasons?.map((reason) => (
              <li key={reason.feature} className="flex justify-between gap-2">
                <span>{reason.title}</span>
                <span className={reason.direction === 'INCREASES_RISK' ? 'text-destructive' : 'text-success'}>
                  {reason.value !== null ? reason.value.toLocaleString('ru-RU') : ''}{' '}
                  {reason.direction === 'INCREASES_RISK' ? '↑ риск' : '↓ риск'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-1 flex items-center justify-between">
            <h4 className="font-medium">Черновик сообщения клиенту</h4>
            {offer.messageDraft && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(offer.messageDraft ?? '');
                  setCopied(true);
                }}
              >
                <Copy aria-hidden />
                {copied ? 'Скопировано' : 'Копировать'}
              </Button>
            )}
          </div>
          {offer.messageDraft ? (
            <p className="rounded-md bg-muted p-3 whitespace-pre-line">{offer.messageDraft}</p>
          ) : (
            <p className="text-muted-foreground">LLM недоступна: черновика нет, предложение можно передать.</p>
          )}
        </section>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => decide('transfer')} disabled={decision.isPending}>
            <Send aria-hidden />
            Передать в факторинг
          </Button>
          <Button variant="outline" onClick={() => decide('reject')} disabled={decision.isPending}>
            <X aria-hidden />
            Отклонить
          </Button>
        </div>
        <ErrorNote error={decision.error} />
      </CardContent>
    </Card>
  );
}

/** Уведомления и сигналы последнего прогона (п. 3.10, 5.3, 5.4) */
function Notifications({ managerId }: { managerId: number | null }) {
  const notifications = useNotifications(managerId);
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4 text-muted-foreground" aria-hidden />
          Уведомления
          <Badge variant="secondary">{notifications.data?.total ?? 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto text-sm">
          {notifications.data?.items.map((item) => (
            <li key={item.id} className="rounded-md border p-2">
              <div className="flex items-center gap-2">
                {item.type === 'RISK_SIGNAL' && <ShieldAlert className="size-4 text-destructive" aria-hidden />}
                <span className="font-medium">{label(NOTIFICATION_TYPES, item.type)}</span>
                <span className="ml-auto text-xs text-muted-foreground">{dateTime(item.createdAt)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {item.client?.name}
                {item.updNumber ? ` · УПД ${item.updNumber}` : ''}
                {item.type === 'OVERDUE' && item.payload
                  ? ` · остаток ${money(Number(item.payload.outstanding))}, ${String(item.payload.overdueDays)} дн. просрочки`
                  : ''}
                {item.type === 'NEW_OFFER' && item.payload ? ` · ${money(Number(item.payload.ead))}` : ''}
                {item.type === 'RISK_SIGNAL' && item.buyer ? ` · покупатель ${item.buyer.name ?? item.buyer.inn}` : ''}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Карточка клиента (п. 5.5) */
function ClientCardView({ clientId, onSelectOffer }: { clientId: number; onSelectOffer: (offerId: number) => void }) {
  const card = useClientCard(clientId);
  const data = card.data;
  if (!data) return null;

  return (
    <Card className="gap-4 py-5" aria-label="Карточка клиента">
      <CardHeader className="px-5">
        <CardTitle className="text-base">Карточка клиента: {data.client.name}</CardTitle>
        <CardDescription>
          По прогону № {data.runId ?? '—'} на {date(data.calcDate)} · дата внешних данных {date(data.snapshotDate)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5">
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <Summary title="Дебиторка всего" value={money(data.summary.receivablesTotal)} />
          <Summary title="Просрочено" value={money(data.summary.overdue)} />
          <Summary title="Доступно к финансированию" value={money(data.summary.availableForFinancing)} />
          <Summary title="Кассовый разрыв" value={data.summary.cashGap !== null ? money(data.summary.cashGap) : 'нет'} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>УПД</TableHead>
              <TableHead>Покупатель</TableHead>
              <TableHead className="text-right">Остаток</TableHead>
              <TableHead>Кат.</TableHead>
              <TableHead className="text-right">PD</TableHead>
              <TableHead className="text-right">P задержки</TableHead>
              <TableHead className="text-right">P 90+</TableHead>
              <TableHead>Предложение</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.upds.map((upd) => (
              <TableRow key={upd.updId}>
                <TableCell>
                  <div className="font-medium">{upd.number}</div>
                  <div className="text-xs text-muted-foreground">до {date(upd.plannedDueDate)}</div>
                </TableCell>
                <TableCell className="max-w-48 truncate">{upd.buyer?.name ?? upd.buyer?.inn}</TableCell>
                <TableCell className="text-right tabular-nums">{money(upd.outstanding)}</TableCell>
                <TableCell>{upd.category ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{percent(upd.pd)}</TableCell>
                <TableCell className="text-right tabular-nums">{percent(upd.pDelay)}</TableCell>
                <TableCell className="text-right tabular-nums">{percent(upd.pOverdue90)}</TableCell>
                <TableCell>
                  {upd.offerId !== null ? (
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onSelectOffer(upd.offerId!)}>
                      <Check aria-hidden />
                      открыть
                    </Button>
                  ) : (
                    <span className="text-xs">{label(REASONS, upd.noOfferReason)}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.decidedOffers.length > 0 && (
          <div className="text-sm">
            <h4 className="mb-1 font-medium">Решения менеджера</h4>
            <ul className="flex flex-col gap-1 text-xs">
              {data.decidedOffers.map((item) => (
                <li key={item.offerId}>
                  УПД {item.updNumber} · {money(item.ead)} ·{' '}
                  {item.status === 'TRANSFERRED' ? 'передано в факторинг' : 'отклонено'} · {item.decidedBy} ·{' '}
                  {dateTime(item.decidedAt)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Summary({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
