import type { Route } from '@/lib/useHashRoute';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';

const SECTIONS: { route: Route; href: string; title: string }[] = [
  { route: 'process', href: '#/process', title: 'Прогон' },
  { route: 'crm', href: '#/crm', title: 'Эмулятор CRM' },
  { route: 'history', href: '#/history', title: 'История прогонов' },
];

const TITLES: Record<Route, string> = {
  process: 'Экран процесса',
  crm: 'Эмулятор CRM',
  history: 'История прогонов',
};

/** Шапка и вкладки разделов, как на макете экрана процесса (рис. 4 BRD) */
export function AppHeader({ route, sections }: { route?: Route; sections: Route[] }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-header/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[96rem] items-center gap-4 px-4 sm:px-6">
        <Logo />
        {route && <span className="hidden text-lg font-semibold sm:inline">· {TITLES[route]}</span>}
        <div className="ml-auto">
          <UserMenu />
        </div>
      </div>
      {route && (
        <nav className="mx-auto flex max-w-[96rem] gap-2 px-4 pb-3 sm:px-6" aria-label="Разделы">
          {SECTIONS.filter((section) => sections.includes(section.route)).map((section) => (
            <a
              key={section.route}
              href={section.href}
              aria-current={route === section.route ? 'page' : undefined}
              className={cn(
                'rounded-lg border px-5 py-2 text-sm font-medium transition-colors',
                route === section.route
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-primary/50 bg-card text-foreground hover:bg-muted',
              )}
            >
              {section.title}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
