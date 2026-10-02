import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, motion, radius, spacing, typography } from '@/theme';
import { useReducedMotion } from './use-reduced-motion';

export type CompanionState = 'neutral' | 'happy' | 'celebrate' | 'thinking' | 'attention';

export function BrandMark({ size = 40 }: { size?: number }) {
  const reduced = useReducedMotion();
  const entrance = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: motion.normal,
      easing: motion.ease,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, reduced]);
  return (
    <Animated.View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, opacity: entrance }}
    >
      <LinearGradient
        colors={[colors.primaryStrong, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size * 0.28, overflow: 'hidden' }}
      >
        <View
          style={{
            position: 'absolute',
            left: size * 0.34,
            top: size * 0.25,
            width: size * 0.22,
            height: size * 0.58,
            borderRadius: radius.pill,
            backgroundColor: colors.secondary,
            transform: [{ rotate: '34deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.43,
            top: size * 0.28,
            width: size * 0.4,
            height: size * 0.16,
            borderRadius: radius.pill,
            backgroundColor: colors.mint,
            transform: [{ rotate: '-28deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: size * 0.13,
            top: size * 0.12,
            width: size * 0.12,
            height: size * 0.12,
            borderRadius: radius.pill,
            backgroundColor: colors.coral,
          }}
        />
      </LinearGradient>
    </Animated.View>
  );
}

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View accessible accessibilityRole="text" accessibilityLabel="Finance Personal" style={styles.logo}>
      <BrandMark size={compact ? 32 : 40} />
      <View accessible={false}>
        <Text style={compact ? styles.logoCaption : styles.logoEyebrow}>FINANZAS</Text>
        <Text numberOfLines={1} style={compact ? styles.logoCompact : styles.logoName}>
          Finance Personal
        </Text>
      </View>
    </View>
  );
}

export function BrandAvatar({ size = 52, children }: PropsWithChildren<{ size?: number }>) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        backgroundColor: colors.secondarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

export function FinancialCompanion({
  state = 'neutral',
  size = 52,
  decorative = true,
}: {
  state?: CompanionState;
  size?: number;
  decorative?: boolean;
}) {
  const reduced = useReducedMotion();
  const entrance = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: motion.normal,
      easing: motion.ease,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, reduced, state]);
  const body = size * 0.72;
  return (
    <Animated.View
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : `Compañero financiero ${stateLabels[state]}`}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      style={{ opacity: entrance }}
    >
      <BrandAvatar size={size}>
        <LinearGradient
          colors={[colors.secondary, colors.success]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: body,
            height: body,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {state === 'thinking' ? (
            <View style={[styles.brow, { width: size * 0.13, left: size * 0.12, top: size * 0.13 }]} />
          ) : null}
          <View style={[styles.face, { gap: size * 0.13, marginTop: size * 0.07 }]}>
            <View style={[styles.eye, { width: size * 0.055, height: size * 0.085 }]} />
            <View style={[styles.eye, { width: size * 0.055, height: size * 0.085 }]} />
          </View>
          {state === 'attention' ? (
            <View style={[styles.openMouth, { width: size * 0.07, height: size * 0.07 }]} />
          ) : (
            <View
              style={{
                width: size * (state === 'thinking' ? 0.08 : state === 'neutral' ? 0.12 : 0.19),
                height: size * (state === 'neutral' ? 0.035 : 0.09),
                borderBottomWidth: Math.max(1.5, size * 0.035),
                borderBottomColor: colors.primaryStrong,
                borderRadius: state === 'neutral' ? 0 : radius.pill,
                marginTop: size * 0.02,
              }}
            />
          )}
        </LinearGradient>
        {state === 'celebrate' || state === 'attention' ? (
          <View style={[styles.stateBadge, { right: 0, top: 0, width: size * 0.3, height: size * 0.3 }]}>
            <Ionicons
              name={state === 'celebrate' ? 'sparkles' : 'alert'}
              size={size * 0.17}
              color={colors.primaryStrong}
            />
          </View>
        ) : null}
      </BrandAvatar>
    </Animated.View>
  );
}

const stateLabels: Record<CompanionState, string> = {
  neutral: 'neutral',
  happy: 'contento',
  celebrate: 'celebrando',
  thinking: 'pensativo',
  attention: 'atento',
};

const styles = StyleSheet.create({
  logo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  logoEyebrow: { ...typography.caption, color: colors.success, fontSize: 10, fontWeight: '700' },
  logoCaption: { ...typography.caption, color: colors.success, fontSize: 9, fontWeight: '700' },
  logoName: { ...typography.cardTitle, fontSize: 14, lineHeight: 18, color: colors.primaryStrong },
  logoCompact: { ...typography.label, fontSize: 12, lineHeight: 15, color: colors.primaryStrong },
  face: { flexDirection: 'row' },
  eye: { borderRadius: radius.pill, backgroundColor: colors.primaryStrong },
  brow: {
    position: 'absolute',
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryStrong,
    transform: [{ rotate: '-18deg' }],
  },
  openMouth: { marginTop: 3, borderRadius: radius.pill, backgroundColor: colors.primaryStrong },
  stateBadge: {
    position: 'absolute',
    borderRadius: radius.pill,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
