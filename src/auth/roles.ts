import { useAccessToken, useGuestToken } from '@/auth/guest';

export interface Roles {
  /** экран процесса: импорт данных ручной загрузки и запуск прогона */
  operator: boolean;
  /** эмулятор CRM: очередь, карточка клиента, решения по предложениям */
  manager: boolean;
  /** гость «Запуск демо» (П4-1, П4-2): видит всё, но ничего не меняет и не запускает */
  viewer: boolean;
}

const GUEST: Roles = { operator: false, manager: false, viewer: true };

/**
 * Роли realm Keycloak из access token (realm_access.roles).
 * Подпись не проверяется: права проверяет gateway, UI по ролям только скрывает недоступное.
 */
export function rolesOf(accessToken: string | undefined): Roles {
  const roles = realmRoles(accessToken);
  return { operator: roles.includes('operator'), manager: roles.includes('manager'), viewer: false };
}

/**
 * Гость - только просмотр, какие бы роли ни были у демо-пользователя в Keycloak: gateway считает так же.
 */
export function useRoles(): Roles {
  const guest = useGuestToken();
  const roles = rolesOf(useAccessToken());
  return guest ? GUEST : roles;
}

function realmRoles(accessToken: string | undefined): string[] {
  const payload = accessToken?.split('.')[1];
  if (!payload) {
    return [];
  }
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(json, (char) => char.charCodeAt(0));
    const roles = JSON.parse(new TextDecoder().decode(bytes))?.realm_access?.roles;
    return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string') : [];
  } catch {
    return [];
  }
}
