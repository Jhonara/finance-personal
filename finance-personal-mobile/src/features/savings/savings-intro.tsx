import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { Card, Button } from '@/ui/primitives';
import { typography, spacing } from '@/theme';
import { claimSavingsEvent, wasSavingsEventSeen } from './savings-celebrations';

export function SavingsIntro() {
  const { data: user } = useCurrentUser();
  const [visibleFor, setVisibleFor] = useState<number>();
  useEffect(() => {
    if (user?.id === undefined) return;
    let cancelled = false;
    const id = user.id;
    void wasSavingsEventSeen(id, 'intro')
      .then((seen) => {
        if (!seen && !cancelled) setVisibleFor(id);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  useEffect(() => {
    if (visibleFor !== undefined && visibleFor === user?.id)
      void claimSavingsEvent(visibleFor, 'intro').catch(() => undefined);
  }, [visibleFor, user?.id]);
  if (visibleFor === undefined || visibleFor !== user?.id) return null;
  return (
    <Card tone="tonal" style={{ gap: spacing.sm, padding: spacing.lg, marginBottom: spacing.md }}>
      <Text style={typography.cardTitle}>Tus planes tienen su propio espacio</Text>
      <Text style={typography.bodySecondary}>
        Las metas representan objetivos, no cuentas bancarias. Puedes registrar aportes para seguir tu
        progreso.
      </Text>
      <Button size="compact" variant="ghost" onPress={() => setVisibleFor(undefined)}>
        Entendido
      </Button>
    </Card>
  );
}
