import { Redirect } from 'expo-router';
import { MonthDirections } from '@/features/design-lab/month-directions';

export default function DesignLab() {
  if (!__DEV__) return <Redirect href="/(app)" />;
  return <MonthDirections />;
}
