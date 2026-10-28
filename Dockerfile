# dist/ собирает `npm run build` (в CI - job build, сюда приходит артефактом, как app.jar у backend)
#
# nginx без root (слушает непривилегированный порт): отдаёт статику UI и проксирует /api в gateway стенда -
# UI и API на одном origin, CORS не нужен. Настройки стенда - переменные контейнера:
#   SERVER_PORT         - порт nginx, по умолчанию 8080
#   GATEWAY_URI         - адрес gateway в сети стенда, например http://gateway:8090
#   KEYCLOAK_URL        - публичный адрес Keycloak (его открывает браузер), например http://203.0.113.10:8180
#   KEYCLOAK_REALM      - realm стенда, например smart-factoring-test
#   KEYCLOAK_CLIENT_ID  - публичный клиент UI в realm, по умолчанию smart-factoring-ui
#   GUEST_LOGIN         - true: на странице входа кнопка «Запуск демо» (гостевой вход через gateway), по умолчанию false
FROM nginxinc/nginx-unprivileged:1.29-alpine

ENV SERVER_PORT=8080 \
    KEYCLOAK_CLIENT_ID=smart-factoring-ui \
    # envsubst в шаблонах nginx - только своих переменных: $uri, $host и т.п. остаются переменными nginx
    NGINX_ENVSUBST_FILTER="^(SERVER_PORT|GATEWAY_URI)$"

COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 docker/entrypoint.d/40-app-config.sh /docker-entrypoint.d/40-app-config.sh
COPY dist/ /usr/share/nginx/html/

# config.js перезаписывается при старте контейнера (40-app-config.sh) пользователем nginx
USER root
RUN chown nginx /usr/share/nginx/html/config.js
USER nginx
