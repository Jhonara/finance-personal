import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { MotionPressable } from '@/ui/motion';
import { Button } from '@/ui/primitives';

const ideas = [
  { title: 'Un viaje', icon: 'airplane-outline', soft: colors.infoSoft, ink: colors.info },
  {
    title: 'Fondo de emergencia',
    icon: 'shield-checkmark-outline',
    soft: colors.successSoft,
    ink: colors.success,
  },
  { title: 'Algo importante', icon: 'sparkles-outline', soft: colors.accentSoft, ink: colors.accent },
] as const;

export function SavingGoalStarter({ onCreate }: { onCreate(name?: string): void }) {
  return (
    <View style={styles.card}>
      <View style={styles.art}>
        <View style={styles.orbit}>
          <Ionicons name="flag-outline" size={42} color={colors.success} />
        </View>
        <View style={styles.coin}>
          <Ionicons name="sparkles" size={23} color={colors.surface} />
        </View>
      </View>
      <Text accessibilityRole="header" style={typography.sectionTitle}>
        ¿Qué quieres lograr?
      </Text>
      <Text style={typography.bodySecondary}>
        Ponle un nombre y una cantidad a tu meta. Los aportes vendrán después, cuando tú los registres.
      </Text>
      <Text style={typography.label}>Una idea para empezar</Text>
      <View style={styles.ideas}>
        {ideas.map((idea) => (
          <MotionPressable
            key={idea.title}
            accessibilityRole="button"
            accessibilityLabel={`Crear meta ${idea.title}`}
            onPress={() => onCreate(idea.title)}
            style={[styles.idea, { backgroundColor: idea.soft }]}
          >
            <Ionicons name={idea.icon} size={25} color={idea.ink} />
            <Text style={[typography.label, { color: idea.ink, flex: 1 }]}>{idea.title}</Text>
            <Ionicons name="arrow-forward" size={18} color={idea.ink} />
          </MotionPressable>
        ))}
      </View>
      <Button onPress={() => onCreate()}>Crear una meta con mi nombre</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.successSoft,
  },
  art: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
  },
  orbit: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  coin: {
    position: 'absolute',
    right: '27%',
    top: 22,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  ideas: { gap: spacing.sm },
  idea: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.medium,
  },
});
