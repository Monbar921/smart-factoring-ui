import { LogOut, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { stopGuest, useGuestToken } from '@/auth/guest';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu() {
  const auth = useAuth();
  const guest = useGuestToken() !== null;
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // хранилище недоступно - тема только до перезагрузки
    }
    setDark(next);
  };
  const profile = auth.user?.profile;
  const name = guest ? 'Гость (демо)' : profile?.name || profile?.preferred_username || 'Пользователь';
  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate">{name}</span>
          {!guest && profile?.email && (
            <span className="block truncate text-xs font-normal text-muted-foreground">{profile.email}</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={toggleTheme}>
          {dark ? <Sun /> : <Moon />}
          {dark ? 'Светлая тема' : 'Тёмная тема'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => (guest ? stopGuest() : void auth.signoutRedirect())}>
          <LogOut />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
