import { AnalizadorSubnav } from '@/components/analizador/analizador-subnav';
import { requireModulo } from '@/lib/modulos/page-guard';

export default async function AnalizadorLayout({ children }: { children: React.ReactNode }) {
  await requireModulo('analizador_rentabilidad');
  return (
    <div className="min-h-0">
      <div className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <AnalizadorSubnav />
      </div>
      {children}
    </div>
  );
}
