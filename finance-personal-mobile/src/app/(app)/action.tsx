import { useAppTheme } from '@/theme/theme-provider';
import { Redirect } from 'expo-router';

// The central tab is an action. Direct links return to Home instead of opening an empty screen.
export default function ActionRoute() {
  useAppTheme();
  return <Redirect href="/(app)" />;
}
