import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export function BrandSurface({
  children,
  style,
  tone,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; tone?: 'credit' | 'panorama' | 'insight' }>) {
  return (
    <LinearGradient
      colors={
        tone === 'panorama'
          ? [colors.heroStart, colors.primaryStrong, colors.heroEnd]
          : tone === 'insight'
            ? [colors.lavenderSoft, colors.infoSoft, colors.brandMist]
            : tone === 'credit'
              ? [colors.accentSoft, colors.primarySoft, colors.warningSoft]
              : [colors.primarySoft, colors.infoSoft, colors.accentSoft]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.surface, style]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.orb, tone === 'panorama' && styles.heroOrb]}
      />
      {tone === 'panorama' || tone === 'insight' ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.ring, tone === 'panorama' && styles.heroRing]}
        />
      ) : null}
      {children}
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    padding: spacing.lg,
    borderRadius: radius.large,
    borderWidth: 0,
  },
  orb: {
    position: 'absolute',
    width: 120,
    height: 120,
    right: -38,
    top: -52,
    borderRadius: 60,
    backgroundColor: colors.brandGlow,
  },
  heroOrb: {
    width: 170,
    height: 170,
    borderRadius: 85,
    right: -55,
    top: -80,
    backgroundColor: colors.heroSoft,
  },
  ring: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 20,
    borderColor: colors.brandGlow,
    right: -85,
    bottom: -70,
  },
  heroRing: { borderColor: colors.heroSoft, right: -65, bottom: -95 },
});
