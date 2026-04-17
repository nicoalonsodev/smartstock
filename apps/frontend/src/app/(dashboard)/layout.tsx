import { DashboardChrome } from '@/components/dashboard/dashboard-chrome';
import { getSessionProfile } from '@/lib/dashboard/session-profile';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile();
  const userDisplayName = profile?.userDisplayName ?? 'Usuario';
  const canEdit = profile ? profile.rol !== 'visor' : false;

  return (
    <DashboardChrome
      userDisplayName={userDisplayName}
      canEdit={canEdit}
      isAdmin={profile?.rol === 'admin'}
    >
      {children}
    </DashboardChrome>
  );
}
