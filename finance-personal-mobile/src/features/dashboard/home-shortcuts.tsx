import { themedStyleSheet } from '@/theme/themed-styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Text, View, useWindowDimensions } from 'react-native';
import { MotionPressable } from '@/ui/motion';
import { colors, radius, spacing, typography } from '@/theme';
import { TourTarget } from '@/ui/tour-target';
import { currentDashboardPeriod } from './dashboard-period';
import type { HomePriority } from './home-priority';
import { homeShortcutOptions } from './shortcut-preferences';
import { useHomeShortcuts } from './use-home-shortcuts';

export function HomeShortcuts({
  priority = 'general',
  userId,
}: {
  priority?: HomePriority;
  userId?: number;
}) {
  const { width, fontScale } = useWindowDimensions();
  const wrap = width / fontScale < 350;
  const preferences = useHomeShortcuts(userId, priority);
  return (
    <TourTarget id="home-shortcuts">
      <View style={styles.heading}>
        <Text style={typography.cardTitle}>A mano</Text>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Configurar accesos rápidos"
          onPress={() => router.push('/(app)/more')}
          style={styles.edit}
        >
          <Text style={styles.editText}>Personalizar</Text>
        </MotionPressable>
      </View>
      <View style={styles.row}>
        {preferences.selected
          .map((key) => homeShortcutOptions.find((item) => item.key === key)!)
          .map((item) => (
            <MotionPressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={
                item.title === 'Créditos' ? 'Abrir créditos y préstamos' : `Abrir ${item.title.toLowerCase()}`
              }
              onPress={() =>
                router.push(
                  item.route === '/(app)/budgets' || item.route === '/(app)/reports'
                    ? { pathname: item.route, params: currentDashboardPeriod() }
                    : item.route,
                )
              }
              style={[styles.item, wrap && styles.wrappedItem]}
            >
              <Ionicons name={item.icon} size={22} color={colors.primary} />
              <Text style={styles.label}>{item.title}</Text>
            </MotionPressable>
          ))}
      </View>
    </TourTarget>
  );
}
const styles = themedStyleSheet(() => ({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  edit: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm },
  editText: { ...typography.label, color: colors.primary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  wrappedItem: { flexBasis: '45%' },
  label: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
}));
