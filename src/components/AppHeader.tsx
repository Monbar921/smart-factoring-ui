import type { Route } from '@/lib/useHashRoute';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';

const SECTIONS: { route: Route; href: string; title: string }[] = [
  { route: 'process', href: '#/process', title: 'Экран процесса' },
  { route: 'crm', href: '#/crm', title: 'Эмулятор CRM' },
];

export function AppHeader({ route }: { route?: Route }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[96rem] items-center gap-6 px-4 sm:px-6">
        <Logo />
        {route && (
          <nav className="flex gap-1" aria-label="Разделы">
            {SECTIONS.map((section) => (
              <a
                key={section.route}
                href={section.href}
                aria-current={route === section.route ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm hover:bg-muted',
                  route === section.route && 'bg-muted font-medium text-foreground',
                )}
              >
                {section.title}
              </a>
            ))}
          </nav>
        )}
        <div className="ml-auto">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
