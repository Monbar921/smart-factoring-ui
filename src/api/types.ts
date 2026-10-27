/** Типы API backend (smart-factoring-backend docs/claude/module-0/backend-api.md) */

export type RiskLevel = 'A' | 'B' | 'C' | 'D';
export type RunStatus = 'RUNNING' | 'DONE' | 'DONE_WITH_WARNINGS' | 'STOPPED';
export type StepStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'WARNING' | 'STOPPED';

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export interface Ref {
  id: number | null;
  inn: string;
  name: string | null;
}

export interface RunDefaults {
  dataDate: string | null;
  snapshotDate: string | null;
  clients: Ref[];
  runningRunId: number | null;
}

export interface RunStep {
  stepNo: number;
  name: string;
  status: StepStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  metrics: Record<string, unknown> | null;
  /** прогресс долгой части шага (тексты LLM, оценка моделей); null - у шага её нет */
  progress: StepProgress | null;
}

export interface StepProgress {
  label: string;
  done: number;
  total: number;
  /** начало этой части шага: от него считаются скорость и оставшееся время */
  since: string;
}

export interface Run {
  id: number;
  status: RunStatus;
  calcDate: string;
  clientInns: string[] | null;
  initiatorType: 'OPERATOR' | 'API';
  initiator: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  dataDate: string | null;
  snapshotDate: string | null;
  modelVersions: Record<string, string> | null;
  errorMessage: string | null;
  steps: RunStep[];
  comparison: { clients: number; manualMinutes: number; systemMinutes: number; runDurationMs: number | null } | null;
}

export interface RunListItem {
  id: number;
  status: RunStatus;
  calcDate: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  initiator: string | null;
  clientCount: number | null;
  openUpdCount: number | null;
  offerCount: number | null;
  eadTotal: number | null;
}

export interface LogEntry {
  id: number;
  loggedAt: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  stepNo: number | null;
  eventCode: string;
  message: string;
  clientId: number | null;
  buyerId: number | null;
  updId: number | null;
  offerId: number | null;
  details: Record<string, unknown> | null;
}

export interface FunnelStage {
  code: string;
  title: string;
  count: number;
  amount: number;
  dropped: { reason: string; count: number; amount: number }[];
}

export interface RunUpd {
  updId: number;
  number: string;
  updDate: string;
  client: Ref;
  buyer: Ref;
  amount: number;
  outstanding: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  plannedDueDate: string;
  daysToDue: number;
  category: number | null;
  pd: number | null;
  riskLevel: RiskLevel | null;
  pDelay: number | null;
  pOverdue90: number | null;
  decision: 'OFFER' | 'NO_OFFER' | null;
  reason: string | null;
  stage: string | null;
  eadFinal: number | null;
  incomeFinal: number | null;
}

export interface UpdTrace {
  upd: RunUpd;
  steps: { stepNo: number; name: string; summary: string; details: Record<string, unknown> }[];
  log: LogEntry[];
}

export interface Reason {
  feature: string;
  title: string;
  value: number | null;
  direction: 'INCREASES_RISK' | 'DECREASES_RISK';
  contribution: number;
}

export interface Offer {
  offerId: number;
  status: 'QUEUED' | 'TRANSFERRED' | 'REJECTED' | 'REVOKED';
  updId: number;
  updNumber: string;
  updDate: string;
  updOutstanding: number | null;
  client: Ref;
  buyer: Ref;
  ead: number;
  price: number;
  priceRate: number;
  termDays: number;
  riskLevel: RiskLevel;
  pd: number;
  income: number;
  el: number;
  tr: number | null;
  rank: number;
  flags: { delayProbable: boolean; lowData: boolean; reducedToLimit: boolean; isNew: boolean };
  reasons: Reason[] | null;
  reasonsText: string | null;
  messageDraft: string | null;
  queuedAt: string;
  lastRunId: number;
  revokeReason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
}

export interface Manager {
  id: number;
  code: string;
  fullName: string;
  queuedOffers: number;
  notifications: number;
}

export interface Notification {
  id: number;
  runId: number;
  type: 'NEW_OFFER' | 'OVERDUE' | 'REMINDER' | 'RISK_SIGNAL';
  createdAt: string;
  client: Ref | null;
  buyer: Ref | null;
  updId: number | null;
  updNumber: string | null;
  offerId: number | null;
  payload: Record<string, unknown> | null;
}

export interface CardUpd {
  updId: number;
  number: string;
  updDate: string;
  buyer: Ref | null;
  amount: number;
  outstanding: number;
  plannedDueDate: string;
  daysToDue: number;
  category: number | null;
  pd: number | null;
  riskLevel: RiskLevel | null;
  pDelay: number | null;
  pOverdue90: number | null;
  expectedDelayDays: number | null;
  reasons: Reason[] | null;
  offerId: number | null;
  noOfferReason: string | null;
}

export interface ClientCard {
  client: Ref;
  absLiquidity: number;
  runId: number | null;
  calcDate: string | null;
  dataDate: string | null;
  snapshotDate: string | null;
  summary: { receivablesTotal: number; overdue: number; availableForFinancing: number; cashGap: number | null };
  offers: Offer[];
  decidedOffers: Offer[];
  upds: CardUpd[];
}

/** Импорт - дельта (Р-52): итог по таблицам и замечания по строкам */
export interface ImportResult {
  batchId: number;
  dataDate: string | null;
  snapshotDate: string | null;
  rowCounts: Record<string, number>;
  tables: Record<string, { rows: number; inserted: number; updated: number; unchanged: number; conflicts: number }>;
  issueCounts: Record<string, number>;
  issues: ImportIssue[];
}

export interface ImportIssue {
  /** CONFLICT - строка пропущена, CHANGED - запись обновлена, DUPLICATE - возможный дубль, WARNING - требует внимания */
  level: 'CONFLICT' | 'CHANGED' | 'DUPLICATE' | 'WARNING';
  file: string;
  line: number | null;
  key: string | null;
  message: string;
}
