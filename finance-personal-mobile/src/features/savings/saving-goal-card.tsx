import { MotionPressable } from '@/ui/motion';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { Button, Card } from '@/ui/primitives';
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
    <Card style={styles.card}>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={savingsAccessibility(goal, hidden)}
        onPress={onOpen}
        style={styles.content}
      >
        <View style={styles.heading}>
          <View style={[styles.badge, { backgroundColor: tone.soft }]}>
            <Ionicons name={tone.icon} size={24} color={tone.color} />
          </View>
          <View style={styles.grow}>
            <Text style={typography.sectionTitle}>{goal.name}</Text>
            <Text style={[typography.caption, { color: tone.color }]}>{goal.status}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
        <Text style={typography.moneyMedium}>
          {savingsAmount(goal.currentAmount, hidden)} <Text style={typography.caption}>ahorrados</Text>
        </Text>
        <Text style={typography.bodySecondary}>de {savingsAmount(goal.targetAmount, hidden)}</Text>
      </MotionPressable>
      <View style={styles.progressHeading}>
        <Text style={typography.caption}>Avance de la meta</Text>
        <Text style={[typography.cardTitle, { color: tone.color }]}>{goal.percentageLabel}</Text>
      </View>
      {goal.percentage !== undefined ? (
        <Progress value={goal.percentage} color={tone.color} label={`Progreso de ${goal.name}`} />
      ) : null}
      {!goal.completed ? (
        <Text style={typography.bodySecondary}>Te faltan {savingsAmount(goal.remaining, hidden)}</Text>
      ) : null}
      <Text style={typography.bodySecondary}>
        {goal.completed ? '¡Lo lograste! Completaste tu objetivo de ahorro.' : goal.copy}
      </Text>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.lg },
  content: { gap: spacing.xs },
  heading: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', marginBottom: spacing.sm },
  grow: { flex: 1, minWidth: 0, gap: spacing.xs },
  progressHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: spacing.xs },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
