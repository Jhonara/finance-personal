import { Text, type StyleProp, type TextStyle } from 'react-native';
import type { AccountBalance } from '@/features/accounts/account-balances';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { typography } from '@/theme';
import { Skeleton } from './states';

export function accountBalanceLabel(balance: AccountBalance, currency: string, hidden = false) {
  if (balance.status === 'known') return formatPrivateMoney(balance.amount, currency, hidden);
  return balance.status === 'loading' ? 'Cargando saldo' : 'Saldo no disponible';
}

export function AccountBalanceAmount({
  balance,
  currency,
  hidden = false,
  style = typography.moneySmall,
}: {
  balance: AccountBalance;
  currency: string;
  hidden?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  if (balance.status === 'loading') return <Skeleton width={96} height={24} />;
  return (
    <Text style={balance.status === 'known' ? style : typography.caption}>
      {accountBalanceLabel(balance, currency, hidden)}
    </Text>
  );
}
