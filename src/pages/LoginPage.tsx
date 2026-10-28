import { CircleAlert, LogIn, Play, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { startGuest } from '@/auth/guest';
import { Logo } from '@/components/Logo';
import { config } from '@/config';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

/** Пользователь не вошёл: вход - на странице Keycloak, обратно он вернётся с кодом авторизации */
export function LoginPage() {
  const auth = useAuth();
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestPending, setGuestPending] = useState(false);
  const demo = () => {
    setGuestPending(true);
    setGuestError(null);
    startGuest()
      .catch((error: Error) => setGuestError(error.message))
      .finally(() => setGuestPending(false));
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-background via-background to-accent/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Logo className="mb-4" />
          <CardTitle className="text-xl">Вход в систему</CardTitle>
          <CardDescription>Финансирование под уступку денежных требований, лимиты и взаиморасчёты.</CardDescription>
        </CardHeader>
        {auth.error && (
          <CardContent>
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>Не удалось войти</AlertTitle>
              <AlertDescription>{auth.error.message}</AlertDescription>
            </Alert>
          </CardContent>
        )}
        <CardFooter className="flex-col gap-3">
          <Button
            className="w-full"
            size="lg"
            onClick={() => void auth.signinRedirect()}
            disabled={Boolean(auth.activeNavigator)}
          >
            <LogIn />
            Войти
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            Единый вход через Keycloak
          </p>
          {config.guestLogin && (
            <>
              <div className="flex w-full items-center gap-2 text-xs text-muted-foreground" aria-hidden>
                <span className="h-px flex-1 bg-border" />
                или
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button className="w-full" size="lg" variant="outline" onClick={demo} disabled={guestPending}>
                <Play />
                {guestPending ? 'Входим…' : 'Запуск демо'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Гостевой вход без пароля, для показа сценария</p>
              {guestError && (
                <p className="text-sm text-destructive" role="alert">
                  {guestError}
                </p>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
