import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FloatingActionButton, QuickActionModal } from '@/ui/actions';
import { AccountCard, AlertCard, BudgetProgress, StatCard, TransactionRow } from '@/ui/financial';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { Screen } from '@/ui/primitives';
import { previewAccounts, previewBudgets, previewTransactions } from '@/preview/finance-preview';
import { usePrivacy } from '@/privacy/privacy-provider';
import { spacing } from '@/theme';
import { IconButton } from '@/ui/primitives';

export default function HomeScreen() {
  const [quickActions, setQuickActions] = useState(false);
  const { hidden, toggle } = usePrivacy();
  const featuredBudget = previewBudgets[1]!;
  return (
    <Screen scroll>
      <ScreenHeader
        title="Inicio"
        subtitle="Agosto 2026"
        rightAction={
          <IconButton
            name={hidden ? 'eye-off-outline' : 'eye-outline'}
            accessibilityLabel={hidden ? 'Mostrar importes' : 'Ocultar importes'}
            onPress={() => void toggle()}
          />
        }
      />
      <StatCard
        label="Patrimonio neto"
        value={8450000}
        supportingText="Activos COP · Sin conversión de moneda"
        privacyHidden={hidden}
      />
      <View style={styles.stats}>
        <StatCard label="Ingresos" value={4500000} supportingText="Este mes" privacyHidden={hidden} />
        <StatCard label="Flujo neto" value={720000} supportingText="Este mes" privacyHidden={hidden} />
      </View>
      <SectionHeader
        title="Cuentas"
        actionLabel="Ver todas"
        onAction={() => router.push('/(app)/accounts')}
      />
      <View style={styles.list}>
        {previewAccounts.slice(0, 2).map((account) => (
          <AccountCard key={account.name} {...account} privacyHidden={hidden} />
        ))}
      </View>
      <SectionHeader
        title="Presupuesto mensual"
        actionLabel="Ver detalle"
        onAction={() => router.push('/(app)/budgets')}
      />
      <BudgetProgress {...featuredBudget} privacyHidden={hidden} />
      <SectionHeader
        title="Movimientos recientes"
        actionLabel="Ver todos"
        onAction={() => router.push('/(app)/transactions')}
      />
      <View style={styles.list}>
        {previewTransactions.slice(0, 2).map((transaction) => (
          <TransactionRow key={transaction.title} {...transaction} privacyHidden={hidden} />
        ))}
      </View>
      <SectionHeader title="Atención" />
      <AlertCard
        severity="warning"
        title="Presupuesto de transporte"
        description="Has utilizado el 84% del presupuesto mensual."
        actionLabel="Revisar"
        onAction={() => router.push('/(app)/budgets')}
      />
      <FloatingActionButton onPress={() => setQuickActions(true)} />
      <QuickActionModal
        visible={quickActions}
        onClose={() => setQuickActions(false)}
        onExpense={() => {
          setQuickActions(false);
          router.push('/(app)/new-expense');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  list: { gap: spacing.sm },
});
