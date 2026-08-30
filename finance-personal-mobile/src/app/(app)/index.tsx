import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { getDashboardMonth } from '@/api/dashboard-api';

export default function HomeScreen() {
  const now = new Date();
  const dashboard = useQuery({
    queryKey: ['dashboard', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => getDashboardMonth(now.getFullYear(), now.getMonth() + 1),
  });
  if (dashboard.isLoading)
    return (
      <View>
        <Text>Conectando al dashboard…</Text>
      </View>
    );
  if (dashboard.isError)
    return (
      <View>
        <Text>No se pudo consultar el dashboard.</Text>
      </View>
    );
  return (
    <View>
      <Text>Conexión API correcta. Ingreso: {String(dashboard.data?.totalIncome)}</Text>
    </View>
  );
}
