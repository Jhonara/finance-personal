import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { Alert, Credit } from '@/features/secondary/secondary-api';
import { usePrivacy } from '@/privacy/privacy-provider';
import { useUpdateAlert } from '@/features/secondary/use-secondary';
import { useFeedback } from '@/feedback/feedback-provider';
import { Button, Card } from '@/ui/primitives';
import { Disclosure } from '@/ui/disclosure';
import { colors, spacing, typography } from '@/theme';
import { presentAlert } from './alert-presentation';
import { alertDestination } from './alert-navigation';

export function FinancialAlertCard({ alert, credit }: { alert: Alert; credit?: Credit }) {
  const { hidden } = usePrivacy();
  const item = presentAlert(
    alert,
    credit?.name && credit.currency ? { name: credit.name, currency: credit.currency, hidden } : undefined,
    hidden,
  );
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
  const update = useUpdateAlert();
  const closed = alert.state === 'RESOLVED' || alert.state === 'ARCHIVED';
  const snoozed = alert.state === 'SNOOZED';
  const editable = !closed && alert.id !== undefined && alert.revision !== undefined;
  const stateLabel = closed
    ? alert.state === 'RESOLVED'
      ? 'Resuelta'
      : 'Período finalizado'
    : snoozed
      ? 'Pospuesta'
      : alert.read
        ? 'Vista · pendiente'
        : 'Pendiente';
  const run = async (action: 'READ' | 'SNOOZE' | 'RESUME' | 'open') => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      if (action !== 'open' && editable) {
        await update.mutateAsync({ id: alert.id!, revision: alert.revision!, action });
        feedback.show(
          action === 'READ'
            ? 'Vista. Sigue pendiente hasta que cambie la situación.'
            : action === 'SNOOZE'
              ? 'Pospuesta hasta mañana.'
              : 'El aviso vuelve a tus pendientes.',
          'success',
        );
      } else {
        const destination = await alertDestination(item.target, client);
        if (destination) router.push(destination);
        else feedback.show('No pudimos encontrar el detalle actualizado. Actualiza tus alertas.', 'warning');
      }
    } catch {
      feedback.show(
        action !== 'open'
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
          accessibilityLabel={[item.level, stateLabel, item.title, item.context[0]]
            .filter(Boolean)
            .join('. ')}
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
            <Text style={[typography.label, { color: colors.textPrimary, flex: 1 }]}>{stateLabel}</Text>
          </View>
          <Text style={typography.cardTitle}>{item.title}</Text>
          {item.context[0] ? <Text style={typography.bodySecondary}>{item.context[0]}</Text> : null}
        </View>
        <Disclosure title={closed ? 'Detalle del aviso' : 'Por qué aparece'}>
          <Text style={typography.bodySecondary}>{item.description}</Text>
          {item.context.slice(1).map((line) => (
            <Text key={line} style={typography.bodySecondary}>
              {line}
            </Text>
          ))}
          {closed && (
            <Text style={typography.caption}>
              {alert.state === 'ARCHIVED'
                ? 'El período terminó. Esto no significa que el problema se haya solucionado.'
                : 'La condición que generaba este aviso ya no aparece en tus registros.'}
            </Text>
          )}
          {snoozed && (
            <Text style={typography.caption}>
              Volverá a Pendientes al actualizar la app mañana, o antes si cambia la situación. Horario de
              Colombia.
            </Text>
          )}
        </Disclosure>
        {item.target && (
          <Button variant="secondary" disabled={busy} onPress={() => void run('open')}>
            {item.target.kind === 'credit'
              ? 'Ver crédito'
              : item.target.kind === 'recurrence'
                ? 'Revisar programados'
                : item.target.kind === 'reports'
                  ? 'Ver gastos del mes'
                  : 'Ver presupuesto'}
          </Button>
        )}
        {editable && (
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {!alert.read && !snoozed && (
              <View style={{ flex: 1 }}>
                <Button variant="ghost" disabled={busy} onPress={() => void run('READ')}>
                  Marcar como vista
                </Button>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button variant="ghost" disabled={busy} onPress={() => void run(snoozed ? 'RESUME' : 'SNOOZE')}>
                {snoozed ? 'Volver a pendientes' : 'Posponer a mañana'}
              </Button>
            </View>
          </View>
        )}
      </Card>
    </Animated.View>
  );
}
