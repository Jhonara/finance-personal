import { useState } from 'react';
import { router } from 'expo-router';
import { Platform, Text, View } from 'react-native';
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
  const [history, setHistory] = useState(false);
  const query = useInbox(history);
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
        title="Movimientos detectados"
        subtitle="Revisa primero; solo una confirmación cambia tus saldos."
        back
        onBack={() => router.back()}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button variant={history ? 'secondary' : 'primary'} onPress={() => setHistory(false)}>
          Por revisar
        </Button>
        <Button variant={history ? 'primary' : 'secondary'} onPress={() => setHistory(true)}>
          Historial
        </Button>
      </View>
      {!history && (
        <>
          <Button onPress={() => openForm('/(app)/purchase-review')}>Pegar aviso financiero</Button>
          {Platform.OS === 'android' && (
            <>
              <Button variant="secondary" onPress={() => router.push('/(app)/capture-image')}>
                Leer imagen o tomar foto
              </Button>
              <Button variant="secondary" onPress={() => router.push('/(app)/capture-pdf')}>
                Leer comprobante PDF
              </Button>
              <Button variant="ghost" onPress={() => router.push('/(app)/capture-notifications')}>
                Avisos bancarios · opcional
              </Button>
            </>
          )}
          <Button variant="ghost" onPress={() => router.push('/(app)/shortcuts')}>
            Atajos y tarjetas
          </Button>
        </>
      )}
      {query.isPending ? (
        <SkeletonRow />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : !items.length ? (
        <EmptyState
          title={history ? 'Aún no hay movimientos revisados' : 'No tienes movimientos por revisar'}
          description={
            history
              ? 'Aquí aparecerán los avisos confirmados, vinculados o descartados.'
              : 'Comparte o pega el texto de un aviso y revisa sus datos antes de registrarlo.'
          }
        />
      ) : (
        <>
          <Text style={typography.caption}>
            {history
              ? `${query.data?.pages[0]?.totalElements} en el historial`
              : `${query.data?.pages[0]?.totalElements} por revisar`}
          </Text>
          {items.map((draft) => (
            <Card key={draft.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text style={typography.cardTitle}>{draft.fields?.description || 'Aviso descartado'}</Text>
              <Text style={typography.caption}>
                {draft.status === 'POSTED'
                  ? 'Gasto confirmado'
                  : draft.status === 'LINKED'
                    ? 'Vinculado a un movimiento existente'
                    : draft.status === 'DISCARDED'
                      ? 'Descartado'
                      : !draft.fields?.amount || !draft.fields.currency || !draft.fields.effectiveDate
                        ? 'Información incompleta'
                        : draft.matches?.length
                          ? 'Posible duplicado · revisar coincidencias'
                          : 'Pendiente de revisión'}
              </Text>
              {draft.status === 'DISCARDED' ? (
                <Text style={typography.caption}>
                  Datos eliminados al descartar · {purchaseSourceLabel(draft.source)}
                </Text>
              ) : (
                <>
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
                </>
              )}
              {draft.status !== 'DISCARDED' && (
                <Button
                  variant="secondary"
                  onPress={() => openForm('/(app)/purchase-review', { id: String(draft.id) })}
                >
                  {history ? 'Ver resultado' : 'Revisar movimiento'}
                </Button>
              )}
            </Card>
          ))}
          {query.hasNextPage && (
            <Button
              variant="ghost"
              loading={query.isFetchingNextPage}
              disabled={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            >
              {history ? 'Ver más historial' : 'Ver más borradores'}
            </Button>
          )}
        </>
      )}
      {!history && (
        <Disclosure title="Tú decides qué compartir">
          <View style={{ gap: spacing.sm }}>
            <Text style={typography.bodySecondary}>
              El texto y los archivos se interpretan en el teléfono. Si detectamos un movimiento, guardamos
              solo los campos sugeridos como pendiente. Revisa y corrige antes de confirmarlo.
            </Text>
            <Text style={typography.bodySecondary}>
              No leemos automáticamente tus SMS, correo ni Wallet. Si activas los avisos bancarios, solo se
              analizarán las aplicaciones que elijas. No pegues claves ni códigos de verificación.
            </Text>
            <Text style={typography.bodySecondary}>
              Una coincidencia es una pista, no una prueba de duplicado. Puedes vincular un movimiento
              existente o confirmar que es una compra distinta.
            </Text>
          </View>
        </Disclosure>
      )}
    </Screen>
  );
}
