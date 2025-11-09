'use client';

import { SupabaseAuthProvider } from '@/components/providers/SupabaseAuthProvider';

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <SupabaseAuthProvider>
      {children}
    </SupabaseAuthProvider>
  );
}