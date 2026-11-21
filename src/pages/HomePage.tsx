import { useRoles } from '@/auth/roles';
import { AppHeader } from '@/components/AppHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { type Route, useHashRoute } from '@/lib/useHashRoute';
import { CrmPage } from '@/pages/CrmPage';
import { EconomicsPage } from '@/pages/EconomicsPage';
import { MonitoringPage } from '@/pages/MonitoringPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ProcessPage } from '@/pages/ProcessPage';

/**
 * Рабочее место: экран процесса и история прогонов (оператор), эмулятор CRM (менеджер).
 * Экран процесса и историю менеджер видит только для просмотра. Гость видит все экраны, но действия ему закрыты:
 * кнопки неактивны, с подсказкой (П4-1, П4-2).
 */
export function HomePage() {
  const requested = useHashRoute();
  const roles = useRoles();
  const sections: Route[] = [];
  const anyRole = roles.operator || roles.manager || roles.supervisor || roles.viewer;
  if (anyRole) {
    sections.push('process', 'economics', 'monitoring');
  }
  if (roles.manager || roles.supervisor || roles.viewer) {
    sections.push('crm');
  }
  if (anyRole) {
    sections.push('history');
  }
  // недоступный раздел из ссылки - открываем первый доступный
  const route = sections.includes(requested.route) ? requested.route : sections[0];

  return (
    <div className="min-h-svh">
      <AppHeader route={route} sections={sections} />
      <main className="mx-auto max-w-[96rem] px-4 py-5 sm:px-6">
        {route === 'crm' && <CrmPage viewOnly={roles.viewer || (roles.supervisor && !roles.manager)} />}
        {route === 'process' && <ProcessPage canOperate={roles.operator} viewOnly={roles.viewer} runId={requested.runId} />}
        {route === 'economics' && <EconomicsPage runId={requested.runId} />}
        {route === 'monitoring' && <MonitoringPage runId={requested.runId} />}
        {route === 'history' && <HistoryPage canOperate={roles.operator} viewOnly={roles.viewer} />}
        {route === undefined && (
          <Alert>
            <AlertTitle>Нет доступа</AlertTitle>
            <AlertDescription>
              У вашей учётной записи нет ролей operator, manager или supervisor. Обратитесь к администратору Keycloak.
            </AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
}
