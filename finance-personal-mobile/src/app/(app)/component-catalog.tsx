import { useState } from 'react';
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/theme/theme-provider';
import { spacing, typography } from '@/theme';
import { Button, Card, Input, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { Disclosure } from '@/ui/disclosure';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { FinancialMetric, StatusBadge } from '@/ui/financial-metric';
import { ReportAmountBars } from '@/features/reports/report-charts';

export default function ComponentCatalog() {
  const { palette, mode, setMode } = useAppTheme();
  const [value, setValue] = useState('');
  const [money, setMoney] = useState('125000');
  const [notice, setNotice] = useState('Ejemplos visuales. Ningún control registra operaciones.');
  if (!__DEV__) return <Redirect href="/(app)" />;
  return (
    <Screen scroll keyboard>
      <ScreenHeader title="Catálogo de componentes" subtitle="Desarrollo · datos ilustrativos" back />
      <Text style={typography.bodySecondary}>{notice}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {(['system', 'light', 'dark'] as const).map((next) => (
          <Button
            key={next}
            size="compact"
            variant={mode === next ? 'primary' : 'secondary'}
            onPress={() => void setMode(next)}
          >
            {next}
          </Button>
        ))}
      </View>
      <SectionHeader title="Tipografía y cifras" />
      <Text style={typography.screenTitle}>Tu dinero, con claridad</Text>
      <Text style={typography.body}>Inter · una familia, jerarquía consistente y texto adaptable.</Text>
      <Card style={{ padding: spacing.lg }}>
        <FinancialMetric
          label="Ingreso de ejemplo"
          value="$ 1.250.000 COP"
          tone="income"
          icon="arrow-down-outline"
        />
        <FinancialMetric
          label="Gasto de ejemplo"
          value="$ 80.000 COP"
          tone="expense"
          icon="arrow-up-outline"
        />
        <StatusBadge label="Deuda · capital pendiente" tone="debt" />
      </Card>
      <SectionHeader title="Acciones y estados" />
      <Button onPress={() => setNotice('Acción visual completada.')}>Acción principal</Button>
      <Button variant="secondary">Acción secundaria</Button>
      <Button variant="outline">Acción alternativa</Button>
      <Button variant="danger" onPress={() => setNotice('Ejemplo destructivo: no elimina datos.')}>
        Acción destructiva
      </Button>
      <Button disabled>Acción deshabilitada</Button>
      <Button loading>Cargando</Button>
      <SectionHeader title="Formulario" />
      <Input
        label="Nombre de ejemplo"
        value={value}
        onChangeText={setValue}
        helperText="Se conserva al cambiar de tema."
      />
      <Input label="Campo con error" error="Revisa este dato para continuar." />
      <Input label="Contraseña de ejemplo" secureTextEntry />
      <MoneyInput label="Importe de ejemplo" value={money} onChangeText={setMoney} currency="COP" />
      <SelectField label="Selector de ejemplo" value="Cuenta en COP" />
      <Disclosure title="Contenido desplegable">
        <Text style={typography.body}>Detalle accesible, sin cambiar el estado del formulario.</Text>
      </Disclosure>
      <SectionHeader title="Visualización aislada" />
      <Text style={typography.caption}>Escala común, valores ilustrativos; usa el motor SVG instalado.</Text>
      <ReportAmountBars
        currency="COP"
        hidden={false}
        items={[
          { key: 'income', name: 'Ingresos de ejemplo', value: 100000, color: palette.income },
          { key: 'expense', name: 'Gastos de ejemplo', value: 70000, color: palette.expense },
        ]}
      />
      <EmptyState
        title="Aún no hay registros"
        description="Una explicación breve y una próxima acción clara."
      />
      <SkeletonRow />
      <ErrorState onRetry={() => setNotice('Reintento ilustrativo.')} />
      <StatusBadge label="Acción completada" tone="income" />
    </Screen>
  );
}
