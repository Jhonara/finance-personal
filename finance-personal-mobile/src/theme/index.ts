import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  background: '#F3F9FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSecondary: '#EAF4F5',
  textPrimary: '#102E38',
  textSecondary: '#47616B',
  textMuted: '#5C737C',
  border: '#D8E7E9',
  divider: '#E6EFF0',
  primary: '#0F5D69',
  primaryStrong: '#0A3F4C',
  primaryPressed: '#083542',
  primarySoft: '#DDF3F1',
  accent: '#6550B5',
  accentSoft: '#EFE9FF',
  success: '#087B5C',
  successSoft: '#DBF7E9',
  warning: '#925911',
  warningSoft: '#FFF0CF',
  danger: '#B6404B',
  dangerSoft: '#FFE6E5',
  expense: '#B6404B',
  expenseSoft: '#FFE9E6',
  info: '#176F9C',
  infoSoft: '#DEF3FC',
  lavenderSoft: '#EFE9FF',
  credit: '#245F87',
  creditSoft: '#E1F0FC',
  coral: '#F36565',
  coralStrong: '#C94350',
  coralSoft: '#FFE6E3',
  mint: '#19B589',
  brandMist: '#E9F8F4',
  brandGlow: 'rgba(255,255,255,0.45)',
  heroStart: '#103A49',
  heroEnd: '#0F6070',
  heroSoft: 'rgba(255,255,255,0.13)',
} as const;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 } as const;
export const radius = { small: 10, medium: 14, large: 20, pill: 999 } as const;
export const sizes = { touchTarget: 48, button: 48, icon: 22, fab: 56, input: 52, tabBar: 64 } as const;
export const motion = {
  fast: 140,
  normal: 200,
  slow: 280,
  pressScale: 0.98,
  pressOpacity: 0.88,
  stagger: 24,
  distance: 6,
  sheetDistance: 24,
  feedbackHold: 3200,
  ease: (t: number) => 1 - Math.pow(1 - t, 3),
} as const;

export const shadows: Record<'card' | 'floating' | 'bottomSheet', ViewStyle> = {
  card:
    Platform.select({
      ios: {
        shadowColor: '#154451',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 },
      },
      android: { elevation: 2 },
    }) ?? {},
  floating:
    Platform.select({
      ios: {
        shadowColor: '#103A49',
        shadowOpacity: 0.16,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 5 },
    }) ?? {},
  bottomSheet:
    Platform.select({
      ios: {
        shadowColor: '#103A49',
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 8 },
    }) ?? {},
};

const systemFont = Platform.select({
  ios: 'Inter_400Regular',
  android: 'Inter_400Regular',
  default: 'Inter_400Regular',
});
const semiboldFont = 'Inter_600SemiBold';
const boldFont = 'Inter_700Bold';
export const typography: Record<
  | 'display'
  | 'screenTitle'
  | 'sectionTitle'
  | 'cardTitle'
  | 'body'
  | 'bodySecondary'
  | 'label'
  | 'caption'
  | 'moneyLarge'
  | 'moneyMedium'
  | 'moneySmall'
  | 'button',
  TextStyle
> = {
  display: {
    fontFamily: boldFont,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  screenTitle: {
    fontFamily: boldFont,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontFamily: boldFont,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardTitle: {
    fontFamily: semiboldFont,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  body: {
    fontFamily: systemFont,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  bodySecondary: {
    fontFamily: systemFont,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  label: {
    fontFamily: semiboldFont,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  caption: {
    fontFamily: systemFont,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
    color: colors.textMuted,
  },
  moneyLarge: {
    fontFamily: boldFont,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.textPrimary,
  },
  moneyMedium: {
    fontFamily: boldFont,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.textPrimary,
  },
  moneySmall: {
    fontFamily: semiboldFont,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: colors.textPrimary,
  },
  button: { fontFamily: boldFont, fontSize: 16, lineHeight: 20, fontWeight: '700' },
};

export const lightTheme = { colors, spacing, radius, sizes, shadows, typography, motion } as const;
export type AppTheme = typeof lightTheme;
