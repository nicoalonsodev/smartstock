'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  FileSpreadsheet,
  LayoutDashboard,
  Package,
  Plus,
  Truck,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const ITEMS: {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof FileSpreadsheet;
  isActive: (pathname: string) => boolean;
}[] = [
  {
    href: '/analizador',
    label: 'Resumen',
    shortLabel: 'Resumen',
    icon: LayoutDashboard,
    isActive: (p) => p === '/analizador',
  },
  {
    href: '/analizador/listas',
    label: 'Listas de precios',
    shortLabel: 'Listas',
    icon: FileSpreadsheet,
    isActive: (p) =>
      p.startsWith('/analizador/listas') && p !== '/analizador/listas/nueva',
  },
  {
    href: '/analizador/listas/nueva',
    label: 'Nueva lista',
    shortLabel: 'Nueva lista',
    icon: Plus,
    isActive: (p) => p === '/analizador/listas/nueva',
  },
  {
    href: '/analizador/proveedores',
    label: 'Proveedores',
    shortLabel: 'Proveedores',
    icon: Truck,
    isActive: (p) => p.startsWith('/analizador/proveedores'),
  },
  {
    href: '/analizador/reposicion',
    label: 'Reposición',
    shortLabel: 'Reposición',
    icon: Package,
    isActive: (p) => p.startsWith('/analizador/reposicion'),
  },
];

export function AnalizadorSubnav() {
  const pathname = usePathname() ?? '/analizador';

  return (
    <nav
      aria-label="Secciones del analizador"
      className="border-b bg-muted/30 px-4 py-3 md:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BarChart3 className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
          <span className="text-foreground">Analizador</span>
          <span className="hidden text-muted-foreground sm:inline">·</span>
          <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
            Listas, márgenes y compras
          </span>
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {ITEMS.map(({ href, label, shortLabel, icon: Icon, isActive }) => {
            const active = isActive(pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={label}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
