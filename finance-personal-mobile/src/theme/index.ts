import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  background: '#F7F8F6',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSecondary: '#F1F4F5',
  textPrimary: '#202D32',
  textSecondary: '#718087',
  textMuted: '#89979D',
  border: '#DDE4E6',
  divider: '#E9EDEE',
  primary: '#315D6B',
  primaryStrong: '#234754',
  primaryPressed: '#234754',
  primarySoft: '#E4F1F4',
  accent: '#6674D9',
  accentSoft: '#EEF0FF',
  success: '#2D936C',
  successSoft: '#E4F5ED',
  warning: '#C88A2B',
  warningSoft: '#FFF1D8',
  danger: '#D96565',
  dangerSoft: '#FCE8E8',
  expense: '#D96565',
  expenseSoft: '#FCE8E8',
  info: '#4A8FBC',
  infoSoft: '#E5F2FA',
  lavenderSoft: '#F1ECFA',
} as const;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 } as const;
export const radius = { small: 8, medium: 12, large: 16, pill: 999 } as const;
export const sizes = { touchTarget: 48, button: 48, icon: 22, fab: 56, input: 52, tabBar: 64 } as const;
export const motion = { fast: 140, normal: 240, slow: 360, pressScale: 0.98 } as const;

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
