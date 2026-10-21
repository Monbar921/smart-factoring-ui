import { Logo } from './Logo';
import { UserMenu } from './UserMenu';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <UserMenu />
      </div>
    </header>
  );
}
