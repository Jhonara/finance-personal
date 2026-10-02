import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  background: '#F8FAF7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSecondary: '#F1F4F5',
  textPrimary: '#202D32',
  textSecondary: '#53666F',
  textMuted: '#61747C',
  border: '#DDE4E6',
  divider: '#E9EDEE',
  primary: '#176774',
  primaryStrong: '#124E5B',
  primaryPressed: '#124E5B',
  primarySoft: '#DAF1EF',
  accent: '#6553BD',
  accentSoft: '#EEE8FF',
  success: '#227D5A',
  successSoft: '#DDF6E9',
  warning: '#976119',
  warningSoft: '#FFF0CE',
  danger: '#B94F49',
  dangerSoft: '#FFE8E1',
  expense: '#B94F49',
  expenseSoft: '#FFE8E1',
  info: '#2475A2',
  infoSoft: '#DFF1FD',
  lavenderSoft: '#EEE8FA',
  credit: '#225B86',
  creditSoft: '#E0EEFA',
  brandMist: '#EFF9F4',
  brandGlow: 'rgba(255,255,255,0.45)',
} as const;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 } as const;
export const radius = { small: 8, medium: 12, large: 16, pill: 999 } as const;
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
        shadowColor: '#1E2A31',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }) ?? {},
  floating:
    Platform.select({
      ios: {
        shadowColor: '#1E2A31',
        shadowOpacity: 0.16,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 5 },
    }) ?? {},
  bottomSheet:
    Platform.select({
      ios: {
        shadowColor: '#1E2A31',
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
    fontFamily: systemFont,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  screenTitle: {
    fontFamily: systemFont,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontFamily: systemFont,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardTitle: {
    fontFamily: systemFont,
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
    fontFamily: systemFont,
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
    fontFamily: systemFont,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.textPrimary,
  },
  moneyMedium: {
    fontFamily: systemFont,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.textPrimary,
  },
  moneySmall: {
    fontFamily: systemFont,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: colors.textPrimary,
  },
  button: { fontFamily: systemFont, fontSize: 16, lineHeight: 20, fontWeight: '700' },
};

export const lightTheme = { colors, spacing, radius, sizes, shadows, typography, motion } as const;
export type AppTheme = typeof lightTheme;
