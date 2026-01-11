'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type TenantTier = 'free' | 'standard' | 'enterprise';

interface RegistrationState {
  tier: TenantTier | null;
  organizationName: string;
  namespace: string;
  adminEmail: string;
  adminPassword: string;
}

interface RegistrationContextType {
  state: RegistrationState;
  setTier: (tier: TenantTier) => void;
  setOrganization: (name: string, namespace: string) => void;
  setAdmin: (email: string, password: string) => void;
  reset: () => void;
}

const initialState: RegistrationState = {
  tier: null,
  organizationName: '',
  namespace: '',
  adminEmail: '',
  adminPassword: '',
};

const RegistrationContext = createContext<RegistrationContextType | undefined>(
  undefined
);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RegistrationState>(initialState);

  const setTier = (tier: TenantTier) => {
    setState((prev) => ({ ...prev, tier }));
  };

  const setOrganization = (organizationName: string, namespace: string) => {
    setState((prev) => ({ ...prev, organizationName, namespace }));
  };

  const setAdmin = (adminEmail: string, adminPassword: string) => {
    setState((prev) => ({ ...prev, adminEmail, adminPassword }));
  };

  const reset = () => {
    setState(initialState);
  };

  return (
    <RegistrationContext.Provider
      value={{ state, setTier, setOrganization, setAdmin, reset }}
    >
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const context = useContext(RegistrationContext);
  if (context === undefined) {
    throw new Error(
      'useRegistration must be used within a RegistrationProvider'
    );
  }
  return context;
}
