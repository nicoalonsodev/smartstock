import { redirect } from 'next/navigation';

import { getCachedServerAuth } from '@/lib/supabase/cached-auth';

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getCachedServerAuth();
  if (!user) redirect('/login');

  const { data: config } = await supabase
    .from('modulo_config')
    .select('facturador_pos')
    .maybeSingle();

  if (!config?.facturador_pos) redirect('/');

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {children}
    </div>
  );
}
