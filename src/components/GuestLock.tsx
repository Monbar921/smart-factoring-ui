import type { ReactNode } from 'react';
import { Hint } from '@/components/Hint';

export const VIEW_ONLY = 'Гостю доступен только просмотр';

/**
 * Действие, закрытое гостю (замечания 30.10, П4-1, П4-2): кнопка видна, но неактивна, причина - в подсказке.
 * Кнопку внутри делает неактивной вызывающий (disabled); неактивная кнопка не получает событий мыши, поэтому подсказку
 * показывает обёртка. Запрет - на сервере (gateway), здесь только видно, что функция есть.
 */
export function GuestLock({ locked, text = VIEW_ONLY, children }: { locked: boolean; text?: string; children: ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <Hint
      plain
      text={text}
      className="[&_button]:pointer-events-none [&_input]:pointer-events-none [&_label]:pointer-events-none"
    >
      {children}
    </Hint>
  );
}
