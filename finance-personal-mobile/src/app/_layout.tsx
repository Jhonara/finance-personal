import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { useState } from 'react';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

import { AuthProvider } from '@/auth/auth-provider';
import { PrivacyProvider } from '@/privacy/privacy-provider';
import { FeedbackProvider } from '@/feedback/feedback-provider';
import { AppThemeProvider } from '@/theme/theme-provider';
import { KeyboardProvider } from 'react-native-keyboard-controller';

export default function RootLayout() {
  useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardProvider>
        <AuthProvider>
          <AppThemeProvider>
            <PrivacyProvider>
              <FeedbackProvider>
                <Slot />
              </FeedbackProvider>
            </PrivacyProvider>
          </AppThemeProvider>
        </AuthProvider>
      </KeyboardProvider>
    </QueryClientProvider>
  );
}
