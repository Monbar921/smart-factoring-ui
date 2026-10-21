import type { AuthProviderProps } from 'react-oidc-context';
import { config } from '@/config';

/**
 * Вход пользователя на странице Keycloak: Authorization Code + PKCE, токены - в sessionStorage вкладки.
 * Access token живёт 15 минут (accessTokenLifespan realm), oidc-client-ts заранее обновляет его по refresh token.
 */
export const oidcConfig: AuthProviderProps = {
  authority: `${config.keycloakUrl}/realms/${config.keycloakRealm}`,
  client_id: config.keycloakClientId,
  redirect_uri: `${window.location.origin}/`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  scope: 'openid profile email',
  automaticSilentRenew: true,
  // после возврата из Keycloak убираем ?code=...&state=... из адресной строки
  onSigninCallback: () => window.history.replaceState({}, document.title, window.location.pathname),
};
