import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { MotionPressable } from '@/ui/motion';
import { HomeBrandMark } from './home-brand';

export function HomeHeader({
  greeting,
  profileName,
  privacyHidden,
  onPrivacy,
  onProfile,
}: {
  greeting: string;
  profileName?: string;
  privacyHidden: boolean;
  onPrivacy(): void;
  onProfile(): void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.topline}>
        <View style={styles.brand} accessible accessibilityLabel="Finance Personal, Inicio">
          <HomeBrandMark size={38} />
          <View>
            <Text style={styles.brandEyebrow}>FINANZAS</Text>
            <Text style={styles.brandTitle}>Inicio</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel={privacyHidden ? 'Mostrar importes' : 'Ocultar importes'}
            onPress={onPrivacy}
            style={styles.privacy}
          >
            <Ionicons
              name={privacyHidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.primaryStrong}
            />
          </MotionPressable>
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil y preferencias"
            onPress={onProfile}
            style={styles.profile}
          >
            <Text style={styles.profileText}>{profileName?.trim().slice(0, 1).toUpperCase() || 'P'}</Text>
          </MotionPressable>
        </View>
      </View>
      <View style={styles.greeting}>
        <Text accessibilityRole="header" style={styles.greetingTitle}>
          ¡{greeting}! 👋
        </Text>
        <Text style={styles.greetingCopy}>Tu dinero, claro y en movimiento.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  topline: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandEyebrow: {
    ...typography.caption,
    fontSize: 9,
    lineHeight: 12,
    color: colors.success,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  brandTitle: { ...typography.cardTitle, fontSize: 14, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  privacy: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profile: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { ...typography.label, color: colors.surface },
  greeting: { gap: spacing.xs },
  greetingTitle: { ...typography.screenTitle, fontSize: 22, lineHeight: 28 },
  greetingCopy: { ...typography.caption, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
});
