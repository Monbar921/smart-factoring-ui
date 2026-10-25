import { useEffect, useState } from 'react';

export type Route = 'process' | 'crm';

function read(): Route {
  return window.location.hash.startsWith('#/crm') ? 'crm' : 'process';
}

/** Раздел из hash (#/process, #/crm): без роутера, ссылки на разделы работают и после перезагрузки */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
