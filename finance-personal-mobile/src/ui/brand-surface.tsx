import { themedStyleSheet } from '@/theme/themed-styles';
import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/theme-provider';

export function BrandSurface({
  children,
  style,
  tone,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; tone?: 'credit' | 'panorama' | 'insight' }>) {
  const { palette } = useAppTheme();
  return (
    <LinearGradient
      colors={
        tone === 'panorama'
          ? [palette.heroStart, palette.primaryStrong, palette.heroEnd]
          : tone === 'insight'
            ? [palette.lavenderSoft, palette.infoSoft, palette.brandMist]
            : tone === 'credit'
              ? [palette.accentSoft, palette.primarySoft, palette.warningSoft]
              : [palette.primarySoft, palette.infoSoft, palette.accentSoft]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.surface, style]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.orb,
          tone === 'panorama' && styles.heroOrb,
          { backgroundColor: tone === 'panorama' ? palette.heroSoft : palette.brandGlow },
        ]}
      />
      {tone === 'panorama' || tone === 'insight' ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.ring,
            tone === 'panorama' && styles.heroRing,
            { borderColor: tone === 'panorama' ? palette.heroSoft : palette.brandGlow },
          ]}
        />
      ) : null}
      {children}
    </LinearGradient>
  );
}
const styles = themedStyleSheet(() => ({
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
}));
