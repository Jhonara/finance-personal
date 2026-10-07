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
import { categoryAppearance, categorySuggestions } from '@/features/categories/category-appearance';
import { MotionPressable } from '@/ui/motion';
function CategoryForm() {
  const activeSession = useFormSessionActive();
  const params = useLocalSearchParams<{ type?: string; suggestedName?: string }>();
  const type = params.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const [name, setName] = useState(params.suggestedName ?? '');
  const [error, setError] = useState('');
  const m = useCreateCategory();
  const f = useFeedback();
  return (
    <Screen entry scroll keyboard>
      <MovementFormHeader title="Nueva categoría" onBack={() => router.back()} />
      <View style={styles.intro}>
        <View style={styles.icon}>
          <Ionicons
            name={categoryAppearance(name, type).icon}
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
        <Text style={typography.cardTitle}>Elige una idea o escribe la tuya</Text>
        <View style={styles.ideas}>
          {categorySuggestions[type].map((idea) => {
            const look = categoryAppearance(idea, type);
            return (
              <MotionPressable
                key={idea}
                accessibilityRole="button"
                accessibilityState={{ selected: name === idea }}
                onPress={() => {
                  setName(idea);
                  setError('');
                }}
                style={[
                  styles.idea,
                  { backgroundColor: look.soft, borderColor: name === idea ? colors.success : look.soft },
                ]}
              >
                <Ionicons name={look.icon} size={27} color={look.ink} />
                <Text style={[typography.caption, { color: look.ink, textAlign: 'center' }]}>{idea}</Text>
              </MotionPressable>
            );
          })}
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
  section: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  idea: {
    minWidth: 100,
    flexGrow: 1,
    flexBasis: '40%',
    padding: spacing.md,
    minHeight: 80,
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default withFormSession(CategoryForm);
