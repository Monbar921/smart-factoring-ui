import { CircleAlert, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from 'react-oidc-context';
import { Logo } from '@/components/Logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

/** Пользователь не вошёл: вход - на странице Keycloak, обратно он вернётся с кодом авторизации */
export function LoginPage() {
  const auth = useAuth();

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
        </CardFooter>
      </Card>
    </div>
  );
}
