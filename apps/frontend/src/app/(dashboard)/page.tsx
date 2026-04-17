import { DashboardMetricas } from '@/components/dashboard/dashboard-metricas';
import { StockBajoCard } from '@/components/dashboard/stock-bajo-card';
import { VencimientosCard } from '@/components/dashboard/vencimientos-card';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { getSessionProfile } from '@/lib/dashboard/session-profile';

export default async function DashboardPage() {
  const profile = await getSessionProfile();
  const tenantName = profile?.tenantName ?? 'tu negocio';

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <OnboardingWizard />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Bienvenido a SmartStock
        </h1>
        <p className="mt-2 text-muted-foreground">
          Estás trabajando en <span className="font-medium text-foreground">{tenantName}</span>.
        </p>
      </div>

      <section aria-label="Métricas del negocio">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Métricas</h2>
        <DashboardMetricas />
      </section>

      <section aria-label="Alertas de stock y vencimientos">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Alertas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <StockBajoCard />
          <VencimientosCard />
        </div>
      </section>
    </div>
  );
}
