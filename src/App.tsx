import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from 'react-oidc-context';
import { useGuestToken } from '@/auth/guest';
import { oidcConfig } from '@/auth/oidc';
import { Skeleton } from '@/components/ui/skeleton';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <AuthProvider {...oidcConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthGate />
      </QueryClientProvider>
    </AuthProvider>
  );
}

function AuthGate() {
  const auth = useAuth();
  // гость «Запуск демо» входит без Keycloak-сессии в браузере: токен ему выдаёт gateway
  const guest = useGuestToken();

  // разбор ответа Keycloak после редиректа или восстановление сессии из sessionStorage
  if (auth.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }
  return auth.isAuthenticated || guest ? <HomePage /> : <LoginPage />;
}
