import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MotionPressable } from '@/ui/motion';
import { colors, radius, spacing, typography } from '@/theme';

export function PlanTabs({ selected }: { selected: 'budgets' | 'credits' }) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width <= 360 || fontScale >= 1.2;
  return (
    <View accessibilityRole="tablist" style={styles.track}>
      {(
        [
          { key: 'budgets', label: 'Presupuestos', icon: 'pie-chart-outline' },
          { key: 'credits', label: 'Créditos', icon: 'card-outline' },
        ] as const
      ).map((tab) => (
        <MotionPressable
          key={tab.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: selected === tab.key }}
          accessibilityLabel={tab.label}
          onPress={() => {
            if (selected !== tab.key) router.replace(`/(app)/${tab.key}`);
          }}
          style={[styles.tab, selected === tab.key && styles.active]}
        >
          {!compact && (
            <Ionicons
              name={tab.icon}
              size={18}
              color={selected === tab.key ? colors.surface : colors.primaryStrong}
            />
          )}
          <Text
            style={[styles.label, compact && styles.compactLabel, selected === tab.key && styles.activeLabel]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {tab.label}
          </Text>
        </MotionPressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
  },
  active: { backgroundColor: colors.primaryStrong },
  label: { ...typography.label, fontSize: 13, color: colors.primaryStrong, flexShrink: 1 },
  compactLabel: { fontSize: 11, lineHeight: 16 },
  activeLabel: { color: colors.surface },
});
