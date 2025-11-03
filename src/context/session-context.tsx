'use client';

import { createContext, useContext, useMemo } from "react";
import type { Family, Profile } from "@/types/database";

interface SessionUser {
  id: string;
  email: string | null;
}

export interface SessionData {
  user: SessionUser;
  profile: Profile;
  family: Family;
}

const SessionContext = createContext<SessionData | null>(null);

export const SessionProvider = ({
  value,
  children,
}: {
  value: SessionData;
  children: React.ReactNode;
}) => {
  const memoizedValue = useMemo(() => value, [value]);
  return (
    <SessionContext.Provider value={memoizedValue}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession deve ser usado dentro de SessionProvider");
  }

  return context;
};
