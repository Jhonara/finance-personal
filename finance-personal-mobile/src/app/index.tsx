import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';

export default function Index() {
  const { state } = useAuth();
  if (state.status === 'bootstrapping')
    return (
      <View>
        <ActivityIndicator />
      </View>
    );
  return <Redirect href={state.status === 'authenticated' ? '/(app)' : '/(auth)/login'} />;
}
