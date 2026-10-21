// Настройки стенда. В dev пусто - значения берутся из VITE_* (.env.local),
// в образе файл перезаписывается при старте контейнера, см. docker/entrypoint.d/40-app-config.sh
window.__APP_CONFIG__ = {};
