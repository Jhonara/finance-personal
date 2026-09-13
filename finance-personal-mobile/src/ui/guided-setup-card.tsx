import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import type { SetupStep } from '@/features/onboarding/first-run-progress';
import { colors, radius, spacing, typography } from '@/theme';
import { Button } from './primitives';
import { BrandSurface } from './brand-surface';

export function GuidedSetupCard({
  steps,
  completed,
  onAction,
}: {
  steps: SetupStep[];
  completed: number;
  onAction(id: SetupStep['id']): void;
}) {
  const allDone = completed === steps.length;
  return (
    <BrandSurface style={[styles.card, allDone && styles.complete]}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, allDone && styles.headerIconDone]}>
          <Ionicons
            name={allDone ? 'checkmark-circle-outline' : 'compass-outline'}
            size={22}
            color={allDone ? colors.success : colors.primary}
          />
        </View>
        <View style={styles.grow}>
          <Text style={typography.sectionTitle}>
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
                onAction={onAction}
              />
            ))}
          </View>
        </>
      ) : null}
    </BrandSurface>
  );
}

function SetupRow({
  step,
  stepNumber,
  totalSteps,
  recommended,
  onAction,
}: {
  step: SetupStep;
  stepNumber: number;
  totalSteps: number;
  recommended: boolean;
  onAction(id: SetupStep['id']): void;
}) {
  return (
    <View
      accessibilityLabel={`Paso ${stepNumber} de ${totalSteps}. ${step.title}. ${step.resolutionLabel ?? (step.completed ? 'Completado' : 'Pendiente')}`}
      style={[styles.step, step.completed && styles.stepDone, recommended && styles.stepRecommended]}
    >
      <Ionicons
        name={step.completed ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={step.completed ? colors.success : colors.primary}
      />
      <View style={styles.grow}>
        <Text style={[typography.cardTitle, step.completed && styles.doneText]}>{step.title}</Text>
        <Text style={typography.caption}>{step.description}</Text>
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
  doneText: { color: colors.textSecondary },
  resolution: { ...typography.caption, color: colors.textSecondary },
});
