import { NextResponse } from 'next/server';

import { getSessionProfile } from '@/lib/dashboard/session-profile';

export async function GET() {
  const profile = await getSessionProfile();

  if (!profile) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  return NextResponse.json({
    userDisplayName: profile.userDisplayName,
    tenantName: profile.tenantName,
    rol: profile.rol,
  });
}
