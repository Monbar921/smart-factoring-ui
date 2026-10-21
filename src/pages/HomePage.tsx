import { ArrowLeftRight, FileText, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from 'react-oidc-context';
import { AppHeader } from '@/components/AppHeader';
import { HelloCard } from '@/components/HelloCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Разделы, которые появятся в следующих итерациях */
const SECTIONS: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: FileText, title: 'Заявки на финансирование', description: 'Уступка денежных требований по поставкам' },
  { icon: Wallet, title: 'Лимиты и дебиторы', description: 'Лимиты финансирования и контроль задолженности' },
  { icon: ArrowLeftRight, title: 'Взаиморасчёты', description: 'Платежи дебиторов, комиссии и возвраты' },
];

export function HomePage() {
  const profile = useAuth().user?.profile;
  const firstName = profile?.given_name || profile?.preferred_username;

  return (
    <div className="min-h-svh">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {firstName ? `Здравствуйте, ${firstName}` : 'Здравствуйте'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Рабочее место по факторингу: финансирование под уступку требований, лимиты и взаиморасчёты с дебиторами.
            </p>
          </div>
          <HelloCard />
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Разделы">
          {SECTIONS.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="gap-3 border-dashed py-5 shadow-none">
              <CardHeader className="px-5">
                <span className="mb-2 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-4" aria-hidden />
                </span>
                <CardTitle className="flex items-center gap-2 text-base">
                  {title}
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    скоро
                  </Badge>
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
