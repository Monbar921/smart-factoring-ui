import { useRoles } from '@/auth/roles';
import { AppHeader } from '@/components/AppHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { type Route, useHashRoute } from '@/lib/useHashRoute';
import { CrmPage } from '@/pages/CrmPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ProcessPage } from '@/pages/ProcessPage';

/**
 * Рабочее место: экран процесса и история прогонов (оператор), эмулятор CRM (менеджер).
 * Экран процесса и историю менеджер видит только для просмотра.
 */
export function HomePage() {
  const requested = useHashRoute();
  const roles = useRoles();
  const sections: Route[] = [];
  if (roles.operator || roles.manager) {
    sections.push('process');
  }
  if (roles.manager) {
    sections.push('crm');
  }
  if (roles.operator || roles.manager) {
    sections.push('history');
  }
  // недоступный раздел из ссылки - открываем первый доступный
  const route = sections.includes(requested.route) ? requested.route : sections[0];

  return (
    <div className="min-h-svh">
      <AppHeader route={route} sections={sections} />
      <main className="mx-auto max-w-[96rem] px-4 py-5 sm:px-6">
        {route === 'crm' && <CrmPage />}
        {route === 'process' && <ProcessPage canOperate={roles.operator} runId={requested.runId} />}
        {route === 'history' && <HistoryPage canOperate={roles.operator} />}
        {route === undefined && (
          <Alert>
            <AlertTitle>Нет доступа</AlertTitle>
            <AlertDescription>
              У вашей учётной записи нет ролей operator или manager. Обратитесь к администратору Keycloak.
            </AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
}
