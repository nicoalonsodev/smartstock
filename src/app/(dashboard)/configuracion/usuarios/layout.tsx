import { redirect } from 'next/navigation';

import { getSessionProfile } from '@/lib/dashboard/session-profile';

export default async function ConfigUsuariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile();
  if (!profile || profile.rol !== 'admin') {
    redirect('/');
  }
  return children;
}
