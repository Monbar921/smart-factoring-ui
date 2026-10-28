export interface AppConfig {
  /** публичный адрес Keycloak без пути, например http://203.0.113.10:8180 */
  keycloakUrl: string;
  keycloakRealm: string;
  /** публичный клиент realm: Authorization Code + PKCE, без секрета */
  keycloakClientId: string;
  /** кнопка «Запуск демо» на странице входа: гостевой вход через gateway (замечания 28.10, П1-2) */
  guestLogin: boolean;
}

declare global {
  interface Window {
    /** пишется в public/config.js: в образе - из переменных контейнера, один образ на все стенды */
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

const runtime = window.__APP_CONFIG__ ?? {};

export const config: AppConfig = {
  keycloakUrl: (runtime.keycloakUrl || import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180').replace(/\/+$/, ''),
  keycloakRealm: runtime.keycloakRealm || import.meta.env.VITE_KEYCLOAK_REALM || 'smart-factoring-test',
  keycloakClientId: runtime.keycloakClientId || import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'smart-factoring-ui',
  guestLogin: runtime.guestLogin ?? import.meta.env.VITE_GUEST_LOGIN === 'true',
};
