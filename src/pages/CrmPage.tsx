import { Bell, Check, Copy, Send, ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';
import { useClientCard, useManagers, useNotifications, useOfferDecision, useParameters, useQueue } from '@/api/backend';
import type { CardUpd, Offer, RiskLevel } from '@/api/types';
import { HelpButton, Hint } from '@/components/Hint';
import { ErrorNote, RiskBadge } from '@/components/StatusBadges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  NOTIFICATION_TYPES,
  REASONS,
  TEXT_SOURCES,
  buyerTitle,
  lowDataText,
  date,
  dateTime,
  label,
  money,
  percent,
  updLabel,
} from '@/lib/format';
import {
  RISK_HELP_INTRO,
  RISK_HELP_TITLE,
  RISK_SCALE,
  buyerRiskSentence,
  delaySentence,
  outOf100,
  riskBoundsOf,
  riskScaleText,
} from '@/lib/risk';
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
              <CardTitle className="text-base">Очередь предложений для клиентов на обработку</CardTitle>
              <CardDescription>
                Сверху предложения, которые вероятнее всего принесут банку больше дохода. Расчётный приоритет = доход банка ×
                шанс, что клиент согласится. Шанс считается по профилю клиента: базово 7%, выше — если у клиента мало денег на
                счёте или отсрочка по договору 60 дней и больше. Пример: 25 000 ₽ при шансе 15,75% (приоритет 3 938) стоит выше,
                чем 40 000 ₽ при шансе 7% (приоритет 2 800).
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3">
              <Table>
                <TableHeader>
                  {/* шапка в две строки, чтобы очередь помещалась без горизонтальной прокрутки */}
                  <TableRow>
                    <TableHead className="h-auto py-2 align-bottom leading-tight whitespace-normal">Клиент</TableHead>
                    <TableHead className="h-auto py-2 align-bottom leading-tight whitespace-normal">
                      <Hint text="УПД — документ об отгрузке, по которому покупатель ещё должен заплатить.">
                        УПД и<br />
                        покупатель
                      </Hint>
                    </TableHead>
                    <TableHead className="h-auto py-2 text-right align-bottom leading-tight whitespace-normal">
                      <Hint text="Столько банк выплатит клиенту сразу. Это часть суммы УПД: чем надёжнее покупатель, тем доля больше (уровень A — 90%, B — 85%, C — 75%).">
                        Сумма
                        <br />
                        финансирования, ₽
                      </Hint>
                    </TableHead>
                    <TableHead className="h-auto py-2 text-right align-bottom leading-tight whitespace-normal">
                      <Hint text="Столько клиент заплатит банку за весь срок одной суммой, не ежемесячно. Проценты годовых — то же самое в пересчёте на год.">
                        Стоимость
                        <br />
                        факторинга
                      </Hint>
                    </TableHead>
                    <TableHead className="h-auto py-2 text-right align-bottom leading-tight whitespace-normal">
                      <Hint text="Столько заработает банк, если клиент согласится.">
                        Доход
                        <br />
                        банка, ₽
                      </Hint>
                    </TableHead>
                    <TableHead className="h-auto py-2 text-right align-bottom leading-tight whitespace-normal">
                      <Hint text="Сколько дней банк ждёт деньги от покупателя: дни до плановой оплаты плюс ожидаемая задержка.">
                        Срок
                        <br />
                        финансирования, дн.
                      </Hint>
                    </TableHead>
                    <TableHead className="h-auto py-2 align-bottom leading-tight whitespace-normal">
                      <span className="inline-flex items-end gap-1">
                        <span>
                          Риск
                          <br />
                          покупателя
                        </span>
                        <HelpButton title={RISK_HELP_TITLE}>
                          <RiskScaleHelp />
                        </HelpButton>
                      </span>
                    </TableHead>
                    <TableHead className="h-auto py-2 text-right align-bottom leading-tight whitespace-normal">
                      <Hint
                        text="Доход банка × шанс, что клиент согласится. Шанс считается по профилю клиента: базово 7%, выше — если у клиента мало денег на счёте или отсрочка по договору 60 дней и больше."
                        align="end"
                      >
                        Расчётный
                        <br />
                        приоритет, ₽
                      </Hint>
                    </TableHead>
                    <TableHead className="h-auto py-2 align-bottom leading-tight whitespace-normal">Пометки</TableHead>
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
                      <TableCell className="max-w-32 truncate">{item.client.name}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {item.updNumber} <span className="font-normal text-muted-foreground">от {date(item.updDate)}</span>
                        </div>
                        <div className="max-w-44 truncate text-xs text-muted-foreground">{buyerTitle(item.buyer)}</div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">{money(item.ead)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div>{money(item.price)}</div>
                        <div className="text-xs text-muted-foreground">{percent(item.priceRate)} год.</div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">{money(item.income)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">{item.termDays} дн.</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <RiskBadge level={item.riskLevel} /> <span className="text-xs">{RISK_SCALE[item.riskLevel].word}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Hint
                          align="end"
                          text={`${money(item.income)} × шанс согласия ${percent(item.tr)} = ${money(item.rank)}`}
                        >
                          {money(item.rank)}
                        </Hint>
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
      {offer.flags.isNew && (
        <Hint text="Предложение появилось в последнем прогоне.">
          <Badge className="bg-primary/10 text-primary">новое</Badge>
        </Hint>
      )}
      {offer.flags.delayProbable && (
        <Hint text="Модель задержки оценила, что покупатель, скорее всего, заплатит позже срока. Поэтому аванс снижен на ступень.">
          <Badge variant="outline">вероятна задержка</Badge>
        </Hint>
      )}
      {offer.flags.lowData && (
        <Hint text={lowDataText(offer.flags.lowDataReason)}>
          <Badge variant="outline">мало данных</Badge>
        </Hint>
      )}
      {offer.flags.reducedToLimit && (
        <Hint text="Лимит на покупателя почти выбран, поэтому сумма меньше расчётной.">
          <Badge variant="outline">уменьшено до остатка лимита</Badge>
        </Hint>
      )}
    </div>
  );
}

/** Справка «Что значат уровни риска» (П2-1.4) - шкала, одинаковая на всех экранах */
function RiskScaleHelp() {
  const bounds = riskBoundsOf(useParameters().data);
  return (
    <>
      <span className="mb-2 block">{RISK_HELP_INTRO}</span>
      {(Object.keys(RISK_SCALE) as RiskLevel[]).map((level) => (
        <span key={level} className="mb-1 flex items-start gap-2">
          <RiskBadge level={level} />
          <span>
            <span className="font-medium">{RISK_SCALE[level].title}.</span> {riskScaleText(level, bounds)}
          </span>
        </span>
      ))}
    </>
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
  // решение необратимо (предложение уходит из очереди, пакет - в ВТБ Факторинг): сначала подтверждение
  const [confirming, setConfirming] = useState<'transfer' | 'reject' | null>(null);

  const decide = (action: 'transfer' | 'reject') =>
    decision.mutate({ offerId: offer.offerId, action }, { onSuccess: () => onDone(), onSettled: () => setConfirming(null) });

  return (
    <Card className="gap-4 py-5" aria-label="Карточка предложения">
      <CardHeader className="px-5">
        <CardTitle className="text-base">
          {offer.client.name}: {updLabel(offer.updNumber)} от {date(offer.updDate)}
        </CardTitle>
        <CardDescription>Покупатель {buyerTitle(offer.buyer)}</CardDescription>
        <OfferFlags offer={offer} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 text-sm">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          <dt className="text-muted-foreground">
            <Hint text="Столько банк выплатит клиенту сразу. Это часть суммы УПД: чем надёжнее покупатель, тем доля больше (уровень A — 90%, B — 85%, C — 75%).">
              Сумма финансирования
            </Hint>
          </dt>
          <dd className="text-right font-semibold tabular-nums">{money(offer.ead)}</dd>
          <dt className="text-muted-foreground">
            <Hint text="Столько клиент заплатит банку за весь срок одной суммой, не ежемесячно. Проценты годовых — то же самое в пересчёте на год.">
              Стоимость факторинга
            </Hint>
          </dt>
          <dd className="text-right tabular-nums">
            {money(offer.price)} · {percent(offer.priceRate)} год.
          </dd>
          <dt className="text-muted-foreground">
            <Hint text="Сколько дней банк ждёт деньги от покупателя: дни до плановой оплаты плюс ожидаемая задержка.">
              Срок финансирования
            </Hint>
          </dt>
          <dd className="text-right tabular-nums">{offer.termDays} дн.</dd>
          <dt className="text-muted-foreground">Ожидаемые потери, ₽</dt>
          <dd className="text-right tabular-nums">{money(offer.el)}</dd>
          <dt className="text-muted-foreground">Доход банка, ₽</dt>
          <dd className="text-right tabular-nums">{money(offer.income)}</dd>
        </dl>

        <section aria-label="Оценка риска">
          <h4 className="mb-1 flex items-center gap-1 font-medium">
            Оценка риска
            <HelpButton title={RISK_HELP_TITLE}>
              <RiskScaleHelp />
            </HelpButton>
          </h4>
          <p className="flex items-start gap-2">
            <RiskBadge level={offer.riskLevel} />
            <span>{buyerRiskSentence(offer.riskLevel, offer.pd)}</span>
          </p>
          {offer.pDelay !== null && offer.delayThresholdDays !== null && (
            <p className="mt-1">{delaySentence(offer.pDelay, offer.delayThresholdDays)}</p>
          )}
        </section>

        <section>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h4 className="font-medium">Причины оценки</h4>
            {offer.textSource && (
              <Hint align="end" text={`Тексты карточки: ${label(TEXT_SOURCES, offer.textSource)}`}>
                <Badge variant={offer.textSource === 'FAILED' ? 'destructive' : 'secondary'}>
                  {offer.textSource === 'FAILED' ? 'без черновика: сбой LLM' : 'составлено автоматически'}
                </Badge>
              </Hint>
            )}
          </div>
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

        {confirming === null ? (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setConfirming('transfer')} disabled={decision.isPending}>
              <Send aria-hidden />
              Передать в факторинг
            </Button>
            <Button variant="outline" onClick={() => setConfirming('reject')} disabled={decision.isPending}>
              <X aria-hidden />
              Отклонить
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-md border border-primary/40 bg-primary/5 p-3" role="alertdialog">
            <p>
              {confirming === 'transfer'
                ? `Передать ${updLabel(offer.updNumber)} на ${money(offer.ead)} в ВТБ Факторинг? Решение нельзя отменить.`
                : `Отклонить предложение по ${updLabel(offer.updNumber)}? Оно уйдёт из очереди и больше не будет предложено.`}
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant={confirming === 'transfer' ? 'default' : 'destructive'}
                onClick={() => decide(confirming)}
                disabled={decision.isPending}
              >
                {confirming === 'transfer' ? 'Да, передать' : 'Да, отклонить'}
              </Button>
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={decision.isPending}>
                Отмена
              </Button>
            </div>
          </div>
        )}
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
                {item.updNumber ? ` · ${updLabel(item.updNumber)}` : ''}
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

/** Без открытого предложения: решение менеджера по УПД, если оно было, иначе причина последнего прогона */
function noOffer(upd: CardUpd): string {
  if (upd.offerStatus === 'TRANSFERRED') return 'передан в факторинг';
  if (upd.offerStatus === 'REJECTED') return 'отклонён менеджером';
  return label(REASONS, upd.noOfferReason);
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
              <TableHead>
                <span className="inline-flex items-center gap-1">
                  Риск покупателя
                  <HelpButton title={RISK_HELP_TITLE}>
                    <RiskScaleHelp />
                  </HelpButton>
                </span>
              </TableHead>
              <TableHead className="text-right">
                <Hint align="end" text="Из 100 таких счетов столько оплатят позже срока больше порога задержки прогона.">
                  Задержка
                </Hint>
              </TableHead>
              <TableHead className="text-right">
                <Hint align="end" text="Из 100 таких счетов столько не будут оплачены больше 90 дней после срока.">
                  Просрочка 90+
                </Hint>
              </TableHead>
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
                <TableCell className="whitespace-nowrap">
                  {upd.riskLevel ? (
                    <>
                      <RiskBadge level={upd.riskLevel} /> <span className="text-xs">{RISK_SCALE[upd.riskLevel].word}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-right text-xs">{upd.pDelay !== null ? outOf100(upd.pDelay).text : '—'}</TableCell>
                <TableCell className="text-right text-xs">
                  {upd.pOverdue90 !== null ? outOf100(upd.pOverdue90).text : '—'}
                </TableCell>
                <TableCell>
                  {upd.offerId !== null ? (
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onSelectOffer(upd.offerId!)}>
                      <Check aria-hidden />
                      открыть
                    </Button>
                  ) : (
                    <span className="text-xs">{noOffer(upd)}</span>
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
                  {updLabel(item.updNumber)} · {money(item.ead)} ·{' '}
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
