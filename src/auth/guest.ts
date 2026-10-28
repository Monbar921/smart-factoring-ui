import { useSyncExternalStore } from 'react';
import { useAuth } from 'react-oidc-context';

/**
 * Гостевой вход «Запуск демо» (замечания 28.10, П1-2): токен демо-пользователя выдаёт gateway
 * (POST /api/guest/session), пароль в браузер не попадает. Токен - в sessionStorage вкладки, как и обычный вход;
 * за минуту до конца срока запрашивается новый.
 */
const STORAGE_KEY = 'guest-session';
const RENEW_BEFORE_MS = 60_000;
const SESSION_URL = '/api/guest/session';

interface GuestSession {
  accessToken: string;
  expiresAt: number;
}

let session: GuestSession | null = read();
let renewTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function read(): GuestSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as GuestSession | null;
    return value && value.expiresAt > Date.now() ? value : null;
  } catch {
    return null;
  }
}

function set(next: GuestSession | null) {
  session = next;
  try {
    if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // хранилище недоступно - сессия только до перезагрузки
  }
  clearTimeout(renewTimer);
  if (next) {
    renewTimer = setTimeout(
      () => void startGuest().catch(() => set(null)),
      Math.max(0, next.expiresAt - Date.now() - RENEW_BEFORE_MS),
    );
  }
  listeners.forEach((listener) => listener());
}

/** Войти гостем: получить токен демо-пользователя у gateway */
export async function startGuest(): Promise<void> {
  const response = await fetch(SESSION_URL, { method: 'POST' });
  if (!response.ok) {
    throw new Error(
      response.status === 404 ? 'Гостевой вход на этом стенде выключен' : 'Не удалось войти гостем, попробуйте ещё раз',
    );
  }
  const body = (await response.json()) as { accessToken: string; expiresIn: number };
  set({ accessToken: body.accessToken, expiresAt: Date.now() + body.expiresIn * 1000 });
}

export function stopGuest() {
  set(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Токен гостя или null, если гостевого входа нет */
export function useGuestToken(): string | null {
  return useSyncExternalStore(subscribe, () => session?.accessToken ?? null);
}

/** Токен для API: гостя, если он вошёл через «Запуск демо», иначе пользователя Keycloak */
export function useAccessToken(): string | undefined {
  const guest = useGuestToken();
  const user = useAuth().user?.access_token;
  return guest ?? user;
}

// восстановленная из sessionStorage сессия продлевается так же, как новая
if (session) set(session);
