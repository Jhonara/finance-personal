import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useInbox } from '@/features/inbox/inbox-api';
import { purchaseSourceLabel } from '@/features/inbox/shortcut-intake';
import { openForm } from '@/features/forms/form-session';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { formatLocalDate } from '@/utils/local-date';
import { ScreenHeader } from '@/ui/headers';
import { Button, Card, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { Disclosure } from '@/ui/disclosure';
import { spacing, typography } from '@/theme';

export default function InboxScreen() {
  const query = useInbox();
  const { hidden } = usePrivacy();
  const items = query.data?.pages.flatMap((page) => page.content ?? []) ?? [];
  return (
    <Screen
      entry
      scroll
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      style={{ gap: spacing.lg }}
    >
      <ScreenHeader
        title="Por revisar"
        subtitle="Borradores que aún no cambian tu saldo."
        back
        onBack={() => router.back()}
      />
      <Button onPress={() => openForm('/(app)/purchase-review')}>Pegar aviso de compra</Button>
      <Button variant="ghost" onPress={() => router.push('/(app)/shortcuts')}>
        Usar Atajos en iPhone
      </Button>
      {query.isPending ? (
        <SkeletonRow />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : !items.length ? (
        <EmptyState
          title="No tienes compras por revisar"
          description="Pega el texto de un aviso y revisa sus datos antes de registrarlo."
        />
      ) : (
        <>
          <Text style={typography.caption}>{query.data?.pages[0]?.totalElements} por revisar</Text>
          {items.map((draft) => (
            <Card key={draft.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text style={typography.cardTitle}>{draft.fields?.description}</Text>
              <Text style={typography.body}>
                {typeof draft.fields?.amount === 'number' && draft.fields.currency
                  ? formatPrivateMoney(draft.fields.amount, draft.fields.currency, hidden)
                  : 'Importe o moneda por completar'}
              </Text>
              <Text style={typography.caption}>
                {draft.fields?.effectiveDate
                  ? formatLocalDate(draft.fields.effectiveDate)
                  : 'Fecha por completar'}{' '}
                · {purchaseSourceLabel(draft.source)}
              </Text>
              <Button
                variant="secondary"
                onPress={() => openForm('/(app)/purchase-review', { id: String(draft.id) })}
              >
                Revisar compra
              </Button>
            </Card>
          ))}
          {query.hasNextPage && (
            <Button
              variant="ghost"
              loading={query.isFetchingNextPage}
              disabled={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            >
              Ver más borradores
            </Button>
          )}
        </>
      )}
      <Disclosure title="Tú decides qué compartir">
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.bodySecondary}>
            El texto se interpreta en el teléfono. Solo se guardan los campos que revisas, cuando pulsas
            Guardar para revisar.
          </Text>
          <Text style={typography.bodySecondary}>
            La app no lee tus mensajes, correo ni Wallet. No pegues claves ni códigos de verificación.
          </Text>
          <Text style={typography.bodySecondary}>
            Una coincidencia es una pista, no una prueba de duplicado. Puedes vincular un movimiento existente
            o confirmar que es una compra distinta.
          </Text>
        </View>
      </Disclosure>
    </Screen>
  );
}
