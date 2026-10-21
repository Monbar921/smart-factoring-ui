#!/bin/sh
# Запускается entrypoint образа nginx перед стартом: пишет настройки стенда для браузера в config.js.
# Один и тот же образ едет на test и prod - отличаются только переменные контейнера
set -eu

: "${GATEWAY_URI:?GATEWAY_URI is required}"
: "${KEYCLOAK_URL:?KEYCLOAK_URL is required}"
: "${KEYCLOAK_REALM:?KEYCLOAK_REALM is required}"
: "${KEYCLOAK_CLIENT_ID:?KEYCLOAK_CLIENT_ID is required}"

# значение как строка JS: экранируются \ и "
js() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  keycloakUrl: "$(js "$KEYCLOAK_URL")",
  keycloakRealm: "$(js "$KEYCLOAK_REALM")",
  keycloakClientId: "$(js "$KEYCLOAK_CLIENT_ID")",
};
EOF

echo "$0: config.js: keycloak ${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}, client ${KEYCLOAK_CLIENT_ID}; /api -> ${GATEWAY_URI}"
