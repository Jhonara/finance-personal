import { useAppTheme } from '@/theme/theme-provider';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';

export default function Index() {
  useAppTheme();
  const { state } = useAuth();
  if (state.status === 'bootstrapping')
    return (
      <View>
        <ActivityIndicator />
      </View>
    );
  return <Redirect href={state.status === 'authenticated' ? '/(app)' : '/(auth)/login'} />;
}
