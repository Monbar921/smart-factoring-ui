import { useAccessToken } from '@/auth/guest';

export interface Roles {
  /** экран процесса: импорт данных ручной загрузки и запуск прогона */
  operator: boolean;
  /** эмулятор CRM: очередь, карточка клиента, решения по предложениям */
  manager: boolean;
}

/**
 * Роли realm Keycloak из access token (realm_access.roles).
 * Подпись не проверяется: права проверяет gateway, UI по ролям только скрывает недоступное.
 */
export function rolesOf(accessToken: string | undefined): Roles {
  const roles = realmRoles(accessToken);
  return { operator: roles.includes('operator'), manager: roles.includes('manager') };
}

export function useRoles(): Roles {
  return rolesOf(useAccessToken());
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
