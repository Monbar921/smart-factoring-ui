// Тема до первой отрисовки (index.html): тёмная - только по выбору в меню пользователя, иначе светлая.
// Файл, а не inline-скрипт: CSP образа разрешает скрипты только с того же адреса (docker/nginx/security-headers.conf.template)
(() => {
  try {
    document.documentElement.classList.toggle('dark', localStorage.getItem('theme') === 'dark');
  } catch {
    // хранилище недоступно - светлая тема
  }
})();
