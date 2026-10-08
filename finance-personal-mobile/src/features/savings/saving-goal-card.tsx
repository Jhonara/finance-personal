import { MotionEntry, MotionPressable } from '@/ui/motion';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { Button } from '@/ui/primitives';
import { Progress } from '@/ui/progress';
import { savingsAccessibility, type PresentedSavingGoal } from './savings-presentation';
import { savingsAmount } from './savings-money';

export const savingTones = {
  primary: { color: colors.primary, soft: colors.primarySoft, icon: 'flag-outline' },
  accent: { color: colors.accent, soft: colors.lavenderSoft, icon: 'sparkles-outline' },
  info: { color: colors.info, soft: colors.infoSoft, icon: 'compass-outline' },
  success: { color: colors.success, soft: colors.successSoft, icon: 'checkmark-circle-outline' },
} as const;

export function SavingGoalCard({
  goal,
  hidden,
  onOpen,
  onContribute,
}: {
  goal: PresentedSavingGoal;
  hidden: boolean;
  onOpen(): void;
  onContribute(): void;
}) {
  const tone = savingTones[goal.tone];
  return (
    <MotionEntry
      revision={`${goal.id}-${goal.percentageLabel}`}
      style={[styles.card, { borderColor: tone.soft }]}
    >
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={savingsAccessibility(goal, hidden)}
        onPress={onOpen}
        style={styles.content}
      >
        <View style={styles.heading}>
          <View style={[styles.badge, { backgroundColor: tone.soft }]}>
            <View style={[styles.badgeGlow, { borderColor: tone.color }]} />
            <Ionicons name={tone.icon} size={31} color={tone.color} />
          </View>
          <View style={styles.grow}>
            <Text style={typography.sectionTitle}>{goal.name}</Text>
            <Text style={[typography.caption, { color: tone.color }]}>{goal.status}</Text>
          </View>
          <View style={[styles.percent, { backgroundColor: tone.soft }]}>
            <Text style={[typography.cardTitle, { color: tone.color }]}>{goal.percentageLabel}</Text>
          </View>
        </View>
        <View style={styles.amounts}>
          <View>
            <Text style={typography.caption}>YA AHORRASTE</Text>
            <Text style={typography.moneyMedium}>{savingsAmount(goal.currentAmount, hidden)}</Text>
          </View>
          <View style={styles.target}>
            <Text style={typography.caption}>META</Text>
            <Text style={typography.label}>{savingsAmount(goal.targetAmount, hidden)}</Text>
          </View>
        </View>
      </MotionPressable>
      {goal.percentage !== undefined ? (
        <Progress value={goal.percentage} color={tone.color} label={`Progreso de ${goal.name}`} />
      ) : null}
      <View style={[styles.note, { backgroundColor: tone.soft }]}>
        <Ionicons
          name={goal.completed ? 'checkmark-circle-outline' : 'sparkles-outline'}
          size={20}
          color={tone.color}
        />
        <Text style={[typography.bodySecondary, styles.noteText]}>
          {goal.completed
            ? '¡Lo lograste! Completaste tu objetivo de ahorro.'
            : `${goal.copy} Te faltan ${savingsAmount(goal.remaining, hidden)}.`}
        </Text>
      </View>
      <View style={styles.actionRow}>
        <Button
          size="compact"
          variant="secondary"
          tone={goal.completed ? 'success' : 'primary'}
          onPress={goal.completed ? onOpen : onContribute}
          accessibilityLabel={`${goal.completed ? 'Ver meta' : 'Aportar a'} ${goal.name}`}
        >
          {goal.completed ? 'Ver meta' : 'Aportar a esta meta'}
        </Button>
      </View>
    </MotionEntry>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: 26,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  content: { gap: spacing.lg },
  heading: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  grow: { flex: 1, minWidth: 0, gap: spacing.xs },
  percent: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill },
  amounts: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  target: { alignItems: 'flex-end', gap: spacing.xs },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.medium,
  },
  noteText: { flex: 1 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: spacing.xs },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGlow: { position: 'absolute', width: 43, height: 43, borderRadius: 22, borderWidth: 1, opacity: 0.35 },
});
