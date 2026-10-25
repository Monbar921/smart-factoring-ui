import { AppHeader } from '@/components/AppHeader';
import { useHashRoute } from '@/lib/useHashRoute';
import { CrmPage } from '@/pages/CrmPage';
import { ProcessPage } from '@/pages/ProcessPage';

/** Рабочее место: экран процесса (оператор) и эмулятор CRM (менеджер) */
export function HomePage() {
  const route = useHashRoute();

  return (
    <div className="min-h-svh">
      <AppHeader route={route} />
      <main className="mx-auto max-w-[96rem] px-4 py-6 sm:px-6">{route === 'crm' ? <CrmPage /> : <ProcessPage />}</main>
    </div>
  );
}
