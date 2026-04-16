'use client';

import { createContext, useContext } from 'react';

const DashboardRoleContext = createContext({ canEdit: false, isAdmin: false });

export function DashboardRoleProvider({
  canEdit,
  isAdmin,
  children,
}: {
  canEdit: boolean;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  return (
    <DashboardRoleContext.Provider value={{ canEdit, isAdmin }}>
      {children}
    </DashboardRoleContext.Provider>
  );
}

export function useDashboardRole() {
  return useContext(DashboardRoleContext);
}
