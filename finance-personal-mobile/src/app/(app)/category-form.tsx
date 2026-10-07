import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { useCreateCategory } from '@/features/categories/use-categories';
import { useFeedback } from '@/feedback/feedback-provider';
import { Button, Input, Screen } from '@/ui/primitives';
import { MovementFormHeader } from '@/ui/movement-form';
import { colors, radius, spacing, typography } from '@/theme';
function CategoryForm() {
  const activeSession = useFormSessionActive();
  const { type = 'EXPENSE' } = useLocalSearchParams<{ type?: 'EXPENSE' | 'INCOME' }>();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const m = useCreateCategory();
  const f = useFeedback();
  return (
    <Screen entry scroll keyboard>
      <MovementFormHeader title="Nueva categoría" onBack={() => router.back()} />
      <View style={styles.intro}>
        <View style={styles.icon}>
          <Ionicons
            name={type === 'INCOME' ? 'trending-up-outline' : 'pricetag-outline'}
            size={24}
            color={type === 'INCOME' ? colors.success : colors.danger}
          />
        </View>
        <View style={styles.copy}>
          <Text accessibilityRole="header" style={typography.sectionTitle}>
            {type === 'INCOME' ? 'Organiza tus ingresos' : 'Organiza tus gastos'}
          </Text>
          <Text style={typography.bodySecondary}>La verás al registrar nuevos movimientos.</Text>
        </View>
      </View>
      <View style={styles.section}>
        <Input
          label="Nombre de la categoría"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError('');
          }}
          placeholder={type === 'INCOME' ? 'Ej. Nómina' : 'Ej. Alimentación'}
          error={error}
        />
      </View>
      <Button
        loading={m.isPending}
        disabled={m.isPending}
        onPress={() => {
          if (!name.trim()) {
            setError('Escribe un nombre para la categoría.');
            return;
          }
          m.mutate(
            { name: name.trim(), type },
            {
              onSuccess: () => {
                if (!activeSession()) return;
                setName('');
                m.reset();
                f.show('Categoría creada.');
                router.back();
              },
              onError: () => f.show('No pudimos crear la categoría.', 'error'),
            },
          );
        }}
      >
        Crear categoría
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.large,
    backgroundColor: colors.primarySoft,
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  copy: { flex: 1, gap: spacing.xs },
  section: { padding: spacing.lg, borderRadius: radius.large, backgroundColor: colors.surface },
});

export default withFormSession(CategoryForm);
