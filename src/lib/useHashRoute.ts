import { useEffect, useState } from 'react';

/** Вкладки экрана (рис. 4 BRD): прогон, эмулятор CRM (ЭП-7), история прогонов (ЭП-8) */
export type Route = 'process' | 'crm' | 'history';

export interface HashRoute {
  route: Route;
  /** #/process/12 - выбранный прогон; null - последний */
  runId: number | null;
}

function read(): HashRoute {
  const [, section, id] = window.location.hash.split('/');
  const route: Route = section === 'crm' ? 'crm' : section === 'history' ? 'history' : 'process';
  const runId = route === 'process' && id && /^\d+$/.test(id) ? Number(id) : null;
  return { route, runId };
}

/** Раздел из hash (#/process, #/process/12, #/crm, #/history): без роутера, ссылки работают и после перезагрузки */
export function useHashRoute(): HashRoute {
  const [route, setRoute] = useState<HashRoute>(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

/** Открыть прогон на вкладке «Прогон» */
export function openRun(runId: number) {
  window.location.hash = `#/process/${runId}`;
}
