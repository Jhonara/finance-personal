import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useCategories, useUpdateCategory } from '@/features/categories/use-categories';
import { ScreenHeader } from '@/ui/headers';
import { Button, Card, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
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
    <Screen scroll>
      <ScreenHeader title="Categorías" back onBack={() => router.back()} />
      <Pressable accessibilityRole="button" onPress={() => setType('EXPENSE')}>
        <Text>Gastos</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => setType('INCOME')}>
        <Text>Ingresos</Text>
      </Pressable>
      {q.data.length ? (
        q.data.map((x) => (
          <Card key={x.id}>
            <Text>{x.name}</Text>
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
          onAction={() => router.push({ pathname: '/(app)/category-form', params: { type } })}
        />
      )}
      <Button onPress={() => router.push({ pathname: '/(app)/category-form', params: { type } })}>
        Crear categoría
      </Button>
    </Screen>
  );
}
