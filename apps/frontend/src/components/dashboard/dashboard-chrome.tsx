'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Brain,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FolderTree,
  LayoutDashboard,
  Package,
  ScanBarcode,
  Settings,
  ShoppingCart,
  Truck,
  Upload,
  Users,
  UsersRound,
  X,
} from 'lucide-react';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardRoleProvider } from '@/components/dashboard/dashboard-role-context';
import { useModulos } from '@/hooks/useModulos';
import type { ModuloKey } from '@/lib/modulos/modulo-key';
import { cn } from '@/lib/utils';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  modulo?: ModuloKey;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Productos', href: '/productos', icon: Package, modulo: 'stock' },
  { label: 'Categorías', href: '/categorias', icon: FolderTree, modulo: 'stock' },
  { label: 'Movimientos', href: '/movimientos', icon: ArrowLeftRight, modulo: 'stock' },
  { label: 'Importar', href: '/importar', icon: Upload, modulo: 'importador_excel' },
  { label: 'Proveedores', href: '/proveedores', icon: Truck, modulo: 'stock' },
  { label: 'Clientes', href: '/clientes', icon: Users, modulo: 'facturador_simple' },
  { label: 'Facturación', href: '/facturacion', icon: FileText, modulo: 'facturador_simple' },
  { label: 'POS', href: '/facturacion/pos', icon: ScanBarcode, modulo: 'facturador_pos' },
  { label: 'Pedidos', href: '/pedidos', icon: ShoppingCart, modulo: 'pedidos' },
  { label: 'Presupuestos', href: '/presupuestos', icon: FileSpreadsheet, modulo: 'presupuestos' },
  { label: 'IA Precios', href: '/ia-precios', icon: Brain, modulo: 'ia_precios' },
  { label: 'Analizador', href: '/analizador', icon: BarChart3, modulo: 'analizador_rentabilidad' },
  { label: 'Plan y módulos', href: '/configuracion/plan', icon: CreditCard },
  { label: 'ARCA / AFIP', href: '/configuracion/arca', icon: FileText, modulo: 'facturador_arca' },
  { label: 'Usuarios', href: '/configuracion/usuarios', icon: UsersRound, adminOnly: true },
  { label: 'Mi negocio', href: '/configuracion', icon: Settings },
];

function navItemActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  pathname,
  onNavigate,
  className,
  visibleItems,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
  visibleItems: NavItem[];
}) {
  return (
    <nav className={cn('flex flex-col gap-1 p-4', className)}>
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = navItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardChrome({
  userDisplayName,
  canEdit,
  isAdmin = false,
  children,
}: {
  userDisplayName: string;
  canEdit: boolean;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/';
  const [mobileOpen, setMobileOpen] = useState(false);
  const { modulos, loading } = useModulos();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (!item.modulo) return true;
    return modulos[item.modulo];
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // #region agent log
  useEffect(() => {
    const bisSkinCheckedCount = document.querySelectorAll('[bis_skin_checked]').length;
    const sampleAttrs =
      document.body?.firstElementChild && document.body.firstElementChild instanceof HTMLElement
        ? Array.from(document.body.firstElementChild.attributes).map((a) => a.name)
        : [];
    fetch('http://127.0.0.1:7729/ingest/b7d77d9b-b0af-4230-81eb-50c688422230', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b3607a' },
      body: JSON.stringify({
        sessionId: 'b3607a',
        location: 'dashboard-chrome.tsx:hydration-probe',
        message: 'post-mount hydration probe',
        data: {
          bisSkinCheckedCount,
          bodyChildAttrNames: sampleAttrs,
          loading,
          pathname,
          visibleItemsLen: visibleItems.length,
        },
        timestamp: Date.now(),
        hypothesisId: 'H1-H5',
      }),
    }).catch(() => {});
  }, [loading, pathname, visibleItems.length]);
  // #endregion

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-muted/30">
      <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center border-b px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            SmartStock
          </Link>
        </div>
        {loading ? (
          <div className="flex-1 animate-pulse p-4" aria-hidden />
        ) : (
          <SidebarNav pathname={pathname} className="flex-1" visibleItems={visibleItems} />
        )}
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r bg-card shadow-lg transition-transform duration-200 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight"
            onClick={() => setMobileOpen(false)}
          >
            SmartStock
          </Link>
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading ? (
          <div className="flex-1 animate-pulse p-4" aria-hidden />
        ) : (
          <SidebarNav
            pathname={pathname}
            className="flex-1 overflow-y-auto"
            onNavigate={() => setMobileOpen(false)}
            visibleItems={visibleItems}
          />
        )}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <DashboardHeader
          userDisplayName={userDisplayName}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">
          <DashboardRoleProvider canEdit={canEdit} isAdmin={isAdmin}>
            {children}
          </DashboardRoleProvider>
        </main>
      </div>
    </div>
  );
}
