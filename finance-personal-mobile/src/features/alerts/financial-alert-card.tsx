import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { Alert } from '@/features/secondary/secondary-api';
import { useSeenAlert } from '@/features/secondary/use-secondary';
import { useFeedback } from '@/feedback/feedback-provider';
import { Button, Card } from '@/ui/primitives';
import { colors, spacing, typography } from '@/theme';
import { presentAlert } from './alert-presentation';
import { alertDestination } from './alert-navigation';

export function FinancialAlertCard({ alert }: { alert: Alert }) {
  const item = presentAlert(alert);
  const opacity = useRef(new Animated.Value(1)).current;
  const reduced = useRef(true);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const feedback = useFeedback();
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!active) return;
      reduced.current = value;
      if (!value) {
        opacity.setValue(0);
        Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
      }
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      reduced.current = value;
    });
    return () => {
      active = false;
      subscription.remove();
      opacity.stopAnimation();
    };
  }, [opacity]);
  const seen = useSeenAlert(
    () =>
      new Promise<void>((resolve) => {
        if (reduced.current) return resolve();
        Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => resolve());
      }),
  );
  const run = async (action: 'seen' | 'open') => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      if (action === 'seen' && item.seen) {
        await seen.mutateAsync(item.seen);
        feedback.show('Alerta marcada como vista.', 'success');
      } else {
        const destination = await alertDestination(item.target, client);
        if (destination) router.push(destination);
        else feedback.show('No pudimos encontrar el detalle actualizado. Actualiza tus alertas.');
      }
    } catch {
      feedback.show(
        action === 'seen'
          ? 'No pudimos confirmar el cambio. Actualiza las alertas antes de intentarlo nuevamente.'
          : 'No pudimos abrir el detalle. Revisa tu conexión.',
        'error',
      );
    } finally {
      opacity.setValue(1);
      lock.current = false;
      setBusy(false);
    }
  };
  const tone = item.level === 'Importante' ? 'danger' : item.level === 'Atención' ? 'warning' : 'info';
  return (
    <Animated.View style={{ opacity }}>
      <Card style={{ gap: spacing.md, padding: spacing.lg }}>
        <View
          accessible
          accessibilityLabel={[item.level, item.title, ...item.context].join('. ')}
          style={{ gap: spacing.sm }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ padding: spacing.sm, borderRadius: 12, backgroundColor: colors[`${tone}Soft`] }}>
              <Ionicons
                name={
                  tone === 'danger'
                    ? 'alert-circle-outline'
                    : tone === 'warning'
                      ? 'warning-outline'
                      : 'information-circle-outline'
                }
                size={24}
                color={colors[tone]}
              />
            </View>
            <Text style={[typography.label, { color: colors.textPrimary }]}>{item.level}</Text>
          </View>
          <Text style={typography.cardTitle}>{item.title}</Text>
          {item.context.map((line) => (
            <Text key={line} style={typography.bodySecondary}>
              {line}
            </Text>
          ))}
        </View>
        <Text style={typography.bodySecondary}>{item.description}</Text>
        {item.target && (
          <Button variant="secondary" disabled={busy} onPress={() => void run('open')}>
            {item.target.kind === 'credit' ? 'Ver crédito' : 'Ver presupuesto'}
          </Button>
        )}
        {item.seen && (
          <Button variant="ghost" disabled={busy} onPress={() => void run('seen')}>
            Marcar como vista
          </Button>
        )}
      </Card>
    </Animated.View>
  );
}
