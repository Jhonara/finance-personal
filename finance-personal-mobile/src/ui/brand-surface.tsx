import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export function BrandSurface({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <LinearGradient
      colors={[colors.primarySoft, colors.infoSoft, colors.accentSoft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.surface, style]}
    >
      <View pointerEvents="none" style={styles.orb} />
      {children}
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    padding: spacing.lg,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orb: {
    position: 'absolute',
    width: 120,
    height: 120,
    right: -38,
    top: -52,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
});
