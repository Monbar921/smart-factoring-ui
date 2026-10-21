# smart-factoring-ui

Веб-интерфейс smart-factoring: React 19 + TypeScript + Vite, компоненты [shadcn/ui](https://ui.shadcn.com) на Tailwind CSS 4,
запросы к API - TanStack Query, вход пользователя - Keycloak (OIDC, Authorization Code + PKCE).

```
браузер ── страница логина ──▶ keycloak (realm стенда, клиент smart-factoring-ui)
   │  ◀── access token ──┘
   └─ /api/** + Bearer ──▶ ui (nginx) ──▶ gateway ──▶ backend
```

- Пользователь входит на странице Keycloak, UI держит его токены в sessionStorage вкладки и заранее обновляет
  access token по refresh token.
- Все запросы - относительные `/api/...` с тем же origin, что и UI: в dev их проксирует Vite, в образе - nginx.
  Gateway проверяет токен, CORS не нужен.
- Настройки стенда (адрес Keycloak, realm, клиент) браузер берёт из `/config.js`: в образе он пишется при старте
  контейнера, поэтому один образ едет и на test, и на prod.

## Разработка

```bash
npm ci
cp .env.example .env.local   # адрес Keycloak и realm
npm run dev                  # http://localhost:5173
```

Против стенда test на VDS (клиент `smart-factoring-ui` в realm test разрешает redirect на localhost:5173):

```bash
GATEWAY_URL=http://<VDS>:<GATEWAY_PORT> npm run dev
```

с `VITE_KEYCLOAK_URL=http://<VDS>:<KEYCLOAK_PORT>` в `.env.local`.

| Команда                              | Что делает                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `npm run dev`                        | dev-сервер с HMR, `/api` → `GATEWAY_URL` (по умолчанию `http://127.0.0.1:8090`) |
| `npm test`                           | тесты (Vitest + Testing Library)                                                |
| `npm run lint` / `npm run typecheck` | ESLint / tsc                                                                    |
| `npm run format`                     | Prettier, в том числе сортировка классов Tailwind                               |
| `npm run build`                      | сборка в `dist/`                                                                |

Компоненты shadcn/ui добавляются CLI в `src/components/ui`: `npx shadcn@latest add <компонент>`.
Цвета темы (банковская палитра, светлая и тёмная) - CSS-переменные в [src/index.css](src/index.css).

## Образ и деплой

[Dockerfile](Dockerfile) - nginx без root поверх готового `dist/`: статика, SPA-фолбэк на `index.html`,
`/api/` → `GATEWAY_URI`, `/healthz` для healthcheck. Переменные контейнера:

| Переменная           | Пример                     | Описание                                               |
| -------------------- | -------------------------- | ------------------------------------------------------ |
| `SERVER_PORT`        | `8070`                     | порт nginx, по умолчанию 8080                          |
| `GATEWAY_URI`        | `http://gateway:8090`      | gateway в сети стенда                                  |
| `KEYCLOAK_URL`       | `http://203.0.113.10:8180` | публичный адрес Keycloak, его открывает браузер        |
| `KEYCLOAK_REALM`     | `smart-factoring-test`     | realm стенда                                           |
| `KEYCLOAK_CLIENT_ID` | `smart-factoring-ui`       | публичный клиент UI, по умолчанию `smart-factoring-ui` |

CI/CD ([.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml)) - как у smart-factoring-backend: PR в `main`/`test` -
формат, линтер, тесты, сборка; push в `main`/`test` - ещё образ `ghcr.io/monbar921/smart-factoring-ui:<short sha>`
и `repository_dispatch` в [smart-factoring-deploy](https://github.com/Monbar921/smart-factoring-deploy), который раскатывает
сервис `ui` на стенд: `main` → prod, `test` → test.

Настройки репозитория: variable `DEPLOY_REPO` (`Monbar921/smart-factoring-deploy`) и secret `DEPLOY_TOKEN`
(fine-grained PAT только на deploy-репозиторий, Contents: Read and write).

Локально:

```bash
npm run build
docker build -t smart-factoring-ui:local .
```
