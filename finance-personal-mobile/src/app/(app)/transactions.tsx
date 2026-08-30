import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { getTransactions } from '@/api/transactions-api';

export default function TransactionsScreen() {
  const transactions = useQuery({ queryKey: ['transactions', 0], queryFn: () => getTransactions() });
  return (
    <View>
      <Text>Transacciones técnicas: {transactions.data?.totalElements ?? 'cargando'}</Text>
    </View>
  );
}
