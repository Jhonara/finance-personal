import { useState } from 'react';
import { Text, View } from 'react-native';
import { useAccounts } from '@/features/accounts/use-accounts';
import { balanceForAccount } from '@/features/accounts/account-balances';
import { useDashboardMonth } from '@/features/dashboard/use-dashboard-month';
import { accountBalanceLabel } from '@/ui/account-balance';
import { ModalSelector } from '@/ui/modal-selector';
import { Button } from '@/ui/primitives';
import { usePrivacy } from '@/privacy/privacy-provider';
import { spacing, typography } from '@/theme';

export function CreditAccountSelector({
  currency,
  value,
  onChange,
  label,
  disabled,
}: {
  currency?: string;
  value?: number;
  onChange(id?: number): void;
  label: string;
  disabled: boolean;
}) {
  const accounts = useAccounts();
  const now = new Date();
  const dashboard = useDashboardMonth({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const { hidden } = usePrivacy();
  const [open, setOpen] = useState(false);
  const options = (accounts.data ?? [])
    .filter((a) => a.active && a.currency === currency && a.id !== undefined)
    .map((a) => ({
      id: a.id!,
      label: a.name ?? 'Cuenta',
      subtitle: accountBalanceLabel(balanceForAccount(dashboard, a.id), a.currency ?? '', hidden),
    }));
  const selected = options.find((a) => a.id === value);
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.label}>{label} · opcional</Text>
      <Button variant="secondary" disabled={disabled} onPress={() => setOpen(true)}>
        {selected?.label ?? 'Sin vincular una cuenta'}
      </Button>
      {selected && <Text style={typography.caption}>Disponible · {selected.subtitle}</Text>}
      <Text style={typography.caption}>Sin cuenta, el registro solo actualiza el crédito.</Text>
      {value !== undefined && (
        <Button variant="ghost" disabled={disabled} onPress={() => onChange(undefined)}>
          Quitar cuenta
        </Button>
      )}
      {accounts.isError && (
        <Button variant="ghost" onPress={() => void accounts.refetch()}>
          Reintentar cuentas
        </Button>
      )}
      <ModalSelector
        visible={open}
        label={label}
        subtitle="Cuentas activas de la misma moneda"
        options={options}
        loading={accounts.isPending}
        selectedId={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
