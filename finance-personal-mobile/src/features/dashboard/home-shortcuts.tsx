import { themedStyleSheet } from '@/theme/themed-styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Text, View, useWindowDimensions } from 'react-native';
import { MotionPressable } from '@/ui/motion';
import { colors, radius, spacing, typography } from '@/theme';
import { TourTarget } from '@/ui/tour-target';
import { currentDashboardPeriod } from './dashboard-period';

export function HomeShortcuts() {
  const { width, fontScale } = useWindowDimensions();
  const wrap = width / fontScale < 350;
  return (
    <TourTarget id="home-shortcuts">
      <View style={styles.row}>
        {[
          {
            title: 'Presupuestos',
            icon: 'pie-chart-outline',
            route: '/(app)/budgets',
            color: colors.expense,
            soft: colors.expenseSoft,
          },
          {
            title: 'Metas',
            icon: 'flag-outline',
            route: '/(app)/savings',
            color: colors.success,
            soft: colors.successSoft,
          },
          {
            title: 'Créditos',
            icon: 'card-outline',
            route: '/(app)/credits',
            color: colors.lavender,
            soft: colors.lavenderSoft,
          },
          {
            title: 'Reportes',
            icon: 'stats-chart-outline',
            route: '/(app)/reports',
            color: colors.info,
            soft: colors.infoSoft,
          },
        ].map((item) => (
          <MotionPressable
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={
              item.title === 'Créditos' ? 'Abrir créditos y préstamos' : `Abrir ${item.title.toLowerCase()}`
            }
            onPress={() =>
              router.push(
                item.route === '/(app)/budgets' || item.route === '/(app)/reports'
                  ? { pathname: item.route, params: currentDashboardPeriod() }
                  : (item.route as '/(app)/savings' | '/(app)/credits'),
              )
            }
            style={[styles.item, wrap && styles.wrappedItem]}
          >
            <View style={[styles.icon, { backgroundColor: item.soft }]}>
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={23} color={item.color} />
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9} style={styles.label}>
              {item.title}
            </Text>
          </MotionPressable>
        ))}
      </View>
    </TourTarget>
  );
}
const styles = themedStyleSheet(() => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  wrappedItem: { flexBasis: '45%' },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
}));
