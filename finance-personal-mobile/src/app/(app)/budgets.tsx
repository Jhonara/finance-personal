import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { usePrivacy } from '@/privacy/privacy-provider';
import { previewBudgets } from '@/preview/finance-preview';
import { spacing } from '@/theme';
import { BudgetProgress, StatCard } from '@/ui/financial';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { Screen } from '@/ui/primitives';

export default function BudgetsScreen() {
  const { hidden } = usePrivacy();
  return (
    <Screen scroll>
      <ScreenHeader
        title="Presupuestos"
        subtitle="Agosto 2026 · Vista previa"
        back
        onBack={() => router.back()}
      />
      <StatCard
        label="Presupuesto mensual"
        value={1150000}
        supportingText="Usado $ 995.000 de $ 1.150.000"
        privacyHidden={hidden}
      />
      <SectionHeader title="Por categoría" />
      <View style={styles.list}>
        {previewBudgets.map((budget) => (
          <BudgetProgress key={budget.label} {...budget} privacyHidden={hidden} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: spacing.md } });
