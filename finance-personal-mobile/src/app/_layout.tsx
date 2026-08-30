import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/auth/auth-provider';
import { PrivacyProvider } from '@/privacy/privacy-provider';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PrivacyProvider>
          <StatusBar style="dark" />
          <Slot />
        </PrivacyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
