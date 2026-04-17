import { DashboardRentabilidad } from '@/components/analizador/dashboard-rentabilidad';

export default function AnalizadorPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analizador de rentabilidad</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cierre mensual, márgenes y actividad comercial.
        </p>
      </div>
      <DashboardRentabilidad />
    </div>
  );
}
