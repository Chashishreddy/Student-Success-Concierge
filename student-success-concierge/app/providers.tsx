'use client';

import { IdentityProvider } from '@/lib/contexts/IdentityContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <IdentityProvider>{children}</IdentityProvider>;
}
