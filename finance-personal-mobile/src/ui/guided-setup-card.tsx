import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { SetupStep } from '@/features/onboarding/first-run-progress';
import { colors, radius, spacing, typography } from '@/theme';
import { Button } from './primitives';
import { BrandSurface } from './brand-surface';

export function GuidedSetupCard({
  steps,
  completed,
  onAction,
  onContinue,
}: {
  steps: SetupStep[];
  completed: number;
  onAction(id: SetupStep['id']): void;
  onContinue(): void;
}) {
  const allDone = completed === steps.length;
  const compact = completed >= steps.length - 1;
  const completionScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!allDone) return;
    completionScale.setValue(0.85);
    const celebration = Animated.spring(completionScale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    });
    celebration.start();
    return () => celebration.stop();
  }, [allDone, completionScale]);
  return (
    <BrandSurface style={[styles.card, allDone && styles.complete]}>
      <View style={styles.header}>
        <Animated.View
          style={[
            styles.headerIcon,
            allDone && styles.headerIconDone,
            { transform: [{ scale: completionScale }] },
          ]}
        >
          <Ionicons
            name={allDone ? 'checkmark-circle-outline' : 'compass-outline'}
            size={22}
            color={allDone ? colors.success : colors.primary}
          />
        </Animated.View>
        <View style={styles.grow}>
          <Text accessibilityLiveRegion="polite" style={typography.sectionTitle}>
            {allDone ? '¡Listo! Ya tienes tu base financiera.' : 'Configura tus finanzas'}
          </Text>
          <Text style={typography.bodySecondary}>
            {allDone
              ? 'Ahora puedes seguir organizando y entendiendo mejor tu dinero.'
              : 'Completa estos pasos para empezar.'}
          </Text>
        </View>
      </View>
      {!allDone ? (
        <>
          <Text accessibilityLiveRegion="polite" style={styles.progressLabel}>
            {completed} de {steps.length} completados
          </Text>
          <View accessibilityLabel={`${completed} de ${steps.length} pasos completados`} style={styles.track}>
            <View style={[styles.fill, { width: `${(completed / steps.length) * 100}%` }]} />
          </View>
          <View style={styles.steps}>
            {steps.map((step, index) => (
              <SetupRow
                key={step.id}
                step={step}
                stepNumber={index + 1}
                totalSteps={steps.length}
                recommended={step.id === steps.find((candidate) => !candidate.completed)?.id}
                compact={compact && step.completed}
                onAction={onAction}
              />
            ))}
          </View>
        </>
      ) : (
        <Button onPress={onContinue}>Continuar</Button>
      )}
    </BrandSurface>
  );
}

function SetupRow({
  step,
  stepNumber,
  totalSteps,
  recommended,
  compact,
  onAction,
}: {
  step: SetupStep;
  stepNumber: number;
  totalSteps: number;
  recommended: boolean;
  compact: boolean;
  onAction(id: SetupStep['id']): void;
}) {
  return (
    <View
      accessibilityLabel={`Paso ${stepNumber} de ${totalSteps}. ${step.title}. ${step.resolutionLabel ?? (step.completed ? 'Completado' : 'Pendiente')}`}
      style={[
        styles.step,
        compact && styles.stepCompact,
        step.completed && !step.resolutionLabel && styles.stepDone,
        step.resolutionLabel && styles.stepResolved,
        recommended && styles.stepRecommended,
      ]}
    >
      <Ionicons
        name={
          step.resolutionLabel
            ? 'arrow-forward-circle-outline'
            : step.completed
              ? 'checkmark-circle'
              : 'ellipse-outline'
        }
        size={22}
        color={step.resolutionLabel ? colors.info : step.completed ? colors.success : colors.primary}
      />
      <View style={styles.grow}>
        <Text style={[typography.cardTitle, step.completed && styles.doneText]}>{step.title}</Text>
        {!compact ? <Text style={typography.caption}>{step.description}</Text> : null}
        {step.resolutionLabel ? <Text style={styles.resolution}>{step.resolutionLabel}</Text> : null}
      </View>
      {step.actionLabel ? (
        <Button
          size="compact"
          variant="secondary"
          accessibilityLabel={step.actionLabel}
          onPress={() => onAction(step.id)}
        >
          {step.actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.lg },
  complete: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  grow: { flex: 1, gap: spacing.xxs },
  headerIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  headerIconDone: { backgroundColor: colors.successSoft },
  progressLabel: { ...typography.label, color: colors.textSecondary },
  track: {
    height: 8,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  steps: { gap: spacing.sm },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.medium,
  },
  stepRecommended: { backgroundColor: colors.primarySoft },
  stepDone: { backgroundColor: colors.successSoft },
  stepResolved: { backgroundColor: colors.infoSoft },
  stepCompact: { minHeight: 42, paddingVertical: spacing.xs },
  doneText: { color: colors.textSecondary },
  resolution: { ...typography.caption, color: colors.textSecondary },
});
