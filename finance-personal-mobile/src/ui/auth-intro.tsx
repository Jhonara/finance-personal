import { Text, View } from 'react-native';
import { BrandMark } from './brand-identity';
import { MotionEntry } from './motion';
import { colors, spacing, typography } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';

export function AuthIntro({ title, description }: { title: string; description: string }) {
  return (
    <MotionEntry style={styles.container}>
      <View style={styles.brand}>
        <BrandMark size={38} />
        <Text style={styles.brandName}>Finance Personal</Text>
      </View>
      <Text accessibilityRole="header" style={typography.display}>
        {title}
      </Text>
      <Text style={typography.bodySecondary}>{description}</Text>
    </MotionEntry>
  );
}
const styles = themedStyleSheet(() => ({
  container: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  brandName: { ...typography.cardTitle, color: colors.primary },
}));
