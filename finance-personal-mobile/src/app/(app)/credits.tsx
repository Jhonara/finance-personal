import { openForm } from '@/features/forms/form-session';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useCredits } from '@/features/secondary/use-secondary';
import { creditGroups, creditMoney, creditSummary } from '@/features/credits/credit-presentation';
import { CreditCard, creditPanel } from '@/features/credits/credit-components';
import { usePrivacy } from '@/privacy/privacy-provider';
import { Button, Screen } from '@/ui/primitives';
import { BrandSurface } from '@/ui/brand-surface';
import { ScreenHeader } from '@/ui/headers';
import { ErrorState, Skeleton } from '@/ui/states';
import { colors, spacing, typography } from '@/theme';

export default function CreditsScreen() {
  const query = useCredits();
  const { hidden } = usePrivacy();
  const add = () => openForm('/(app)/credit-form');
  return (
    <Screen
      scroll
      style={{ gap: spacing.lg }}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <ScreenHeader
        title="Créditos"
        subtitle="Entiende y controla tus deudas."
        rightAction={
          query.data?.length ? (
            <Button size="compact" variant="secondary" accessibilityLabel="Agregar crédito" onPress={add}>
              + Nuevo
            </Button>
          ) : undefined
        }
        back
        onBack={() => router.back()}
      />
      {query.isPending ? (
        <Skeleton height={160} />
      ) : !query.data ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <BrandSurface tone="credit" style={creditPanel}>
          <Ionicons name="document-text-outline" size={40} color={colors.accent} />
          <Text style={typography.sectionTitle}>Tus deudas, bajo control</Text>
          <Text style={typography.bodySecondary}>
            Agrega un crédito para entender cuánto debes y seguir tus pagos.
          </Text>
          <Button onPress={add}>Agregar crédito</Button>
        </BrandSurface>
      ) : (
        <>
          {query.isError && (
            <Text style={typography.caption}>
              No pudimos actualizar. Estos son los últimos datos disponibles.
            </Text>
          )}
          <BrandSurface tone="credit" style={creditPanel}>
            <Text style={typography.sectionTitle}>Tus deudas</Text>
            {creditSummary(query.data).map((summary) => (
              <View key={summary.currency ?? 'unknown'} style={{ gap: spacing.sm }}>
                <Text style={typography.label}>{summary.currency ?? 'Moneda no disponible'}</Text>
                <Text style={typography.caption}>Saldo pendiente</Text>
                <Text style={typography.moneyMedium}>
                  {creditMoney(summary.total, summary.currency, hidden)}
                </Text>
                <Text style={typography.bodySecondary}>
                  {summary.active} {summary.active === 1 ? 'crédito por completar' : 'créditos por completar'}
                </Text>
              </View>
            ))}
          </BrandSurface>
          {creditGroups(query.data).map((group) => (
            <View key={group.title} style={{ gap: spacing.md }}>
              <Text accessibilityRole="header" style={typography.sectionTitle}>
                {group.title}
              </Text>
              {group.credits.map((credit, index) => (
                <CreditCard
                  key={credit.id ?? index}
                  credit={credit}
                  hidden={hidden}
                  onPress={() => router.push({ pathname: '/(app)/credit-detail', params: { id: credit.id } })}
                />
              ))}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
