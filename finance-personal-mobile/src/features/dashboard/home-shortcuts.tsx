import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { MotionPressable } from '@/ui/motion';
import { colors, radius, spacing, typography } from '@/theme';

export function HomeShortcuts() {
  return (
    <View style={styles.row}>
      {[
        {
          title: 'Guía de inicio',
          icon: 'compass-outline',
          route: '/(app)/guide',
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
          title: 'Mi plan',
          icon: 'grid-outline',
          route: '/(app)/plan',
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
          onPress={() => router.push(item.route as '/(app)/guide' | '/(app)/credits' | '/(app)/plan')}
          style={styles.item}
        >
          <View style={[styles.icon, { backgroundColor: item.soft }]}>
            <Ionicons
              name={item.icon as 'compass-outline' | 'card-outline' | 'grid-outline'}
              size={23}
              color={item.color}
            />
          </View>
          <Text style={styles.label}>{item.title}</Text>
        </MotionPressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.caption, fontWeight: '600', color: colors.primary, textAlign: 'center' },
});
