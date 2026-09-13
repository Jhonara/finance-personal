import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, shadows, spacing, typography } from '@/theme';

type FeedbackTone = 'success' | 'error' | 'info' | 'warning';
const C = createContext<{ show(message: string, tone?: FeedbackTone): void } | null>(null);
export const FeedbackProvider = ({ children }: PropsWithChildren) => {
  const [feedback, setFeedback] = useState<{ message: string; tone: FeedbackTone } | null>(null);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 3200);
    return () => clearTimeout(timer);
  }, [feedback]);
  return (
    <C.Provider value={{ show: (message, tone = 'info') => setFeedback({ message, tone }) }}>
      {children}
      {feedback ? (
        <View accessibilityLiveRegion="polite" style={[styles.feedback, toneStyles[feedback.tone]]}>
          <Ionicons
            name={
              feedback.tone === 'success'
                ? 'checkmark-circle'
                : feedback.tone === 'error'
                  ? 'alert-circle'
                  : 'information-circle'
            }
            size={22}
            color={toneTextStyles[feedback.tone].color}
          />
          <Text style={[typography.bodySecondary, toneTextStyles[feedback.tone]]}>{feedback.message}</Text>
        </View>
      ) : null}
    </C.Provider>
  );
};

const styles = StyleSheet.create({
  feedback: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.huge,
    left: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.floating,
  },
});
const toneStyles = {
  success: { backgroundColor: colors.successSoft },
  error: { backgroundColor: colors.dangerSoft },
  info: { backgroundColor: colors.infoSoft },
  warning: { backgroundColor: colors.warningSoft },
} as const;
const toneTextStyles = {
  success: { color: colors.success },
  error: { color: colors.danger },
  info: { color: colors.info },
  warning: { color: colors.warning },
} as const;
export const useFeedback = () => {
  const x = useContext(C);
  if (!x) throw Error('FeedbackProvider requerido');
  return x;
};
