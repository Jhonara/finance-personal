import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/auth-provider';

export default function AuthLayout() {
  const { state } = useAuth();
  if (state.status === 'authenticated') {
    return <Redirect href="/(app)" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
