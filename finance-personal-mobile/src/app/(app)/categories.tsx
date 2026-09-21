import { openForm } from '@/features/forms/form-session';
import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useCategories, useUpdateCategory } from '@/features/categories/use-categories';
import { ScreenHeader } from '@/ui/headers';
import { Button, Card, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { Chip } from '@/ui/chip';
import { colors, radius, spacing, typography } from '@/theme';
export default function Categories() {
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const q = useCategories(type);
  const m = useUpdateCategory();
  if (q.isPending)
    return (
      <Screen>
        <SkeletonRow />
      </Screen>
    );
  if (q.isError)
    return (
      <Screen>
        <ErrorState onRetry={() => void q.refetch()} />
      </Screen>
    );
  return (
    <Screen scroll style={{ gap: spacing.md }}>
      <ScreenHeader
        title="Categorías"
        subtitle="Organiza ingresos y gastos."
        back
        onBack={() => router.back()}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {(['EXPENSE', 'INCOME'] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: type === value }}
            onPress={() => setType(value)}
            style={({ pressed }) => ({
              minHeight: 48,
              justifyContent: 'center',
              paddingHorizontal: spacing.lg,
              borderRadius: radius.pill,
              backgroundColor: type === value ? colors.primarySoft : colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={typography.label}>{value === 'EXPENSE' ? 'Gastos' : 'Ingresos'}</Text>
          </Pressable>
        ))}
      </View>
      {q.data.length ? (
        q.data.map((x) => (
          <Card key={x.id} style={{ gap: spacing.sm }}>
            <Text style={typography.cardTitle}>{x.name}</Text>
            <Chip tone={x.active ? 'primary' : 'neutral'}>{x.active ? 'Activa' : 'Inactiva'}</Chip>
            <Button
              variant="ghost"
              loading={m.isPending}
              onPress={() => m.mutate({ id: x.id!, data: { active: !x.active, version: x.version ?? 0 } })}
            >
              {x.active ? 'Desactivar' : 'Reactivar'}
            </Button>
          </Card>
        ))
      ) : (
        <EmptyState
          title="No tienes categorías"
          description="Crea una categoría para registrar movimientos."
          actionLabel="Crear categoría"
          onAction={() => openForm('/(app)/category-form', { type })}
        />
      )}
      {!!q.data.length && (
        <Button onPress={() => openForm('/(app)/category-form', { type })}>Crear categoría</Button>
      )}
    </Screen>
  );
}
