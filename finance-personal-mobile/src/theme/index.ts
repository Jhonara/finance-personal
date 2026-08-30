import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  background: '#F8F9F8',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F4F5',
  textPrimary: '#1E2A31',
  textSecondary: '#5F6B72',
  textMuted: '#8A969D',
  border: '#E1E6E8',
  divider: '#E9EDEE',
  primary: '#334E5C',
  primaryPressed: '#263E49',
  primarySoft: '#E4EEF2',
  success: '#31735B',
  successSoft: '#E6F2EC',
  warning: '#A66B1E',
  warningSoft: '#FBF0DE',
  danger: '#B54747',
  dangerSoft: '#FBE9E9',
  info: '#3E7091',
  infoSoft: '#E6F0F5',
} as const;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 } as const;
export const radius = { small: 8, medium: 12, large: 16, pill: 999 } as const;
export const sizes = { touchTarget: 48, button: 48, icon: 22, fab: 56, input: 52, tabBar: 64 } as const;

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

const systemFont = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });
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

export const lightTheme = { colors, spacing, radius, sizes, shadows, typography } as const;
export type AppTheme = typeof lightTheme;
