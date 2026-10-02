import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, motion, radius, shadows, spacing, typography } from '@/theme';

import { useReducedMotion } from '@/ui/use-reduced-motion';
type FeedbackTone = 'success' | 'error' | 'info' | 'warning';
const C = createContext<{ show(message: string, tone?: FeedbackTone): void } | null>(null);
export const FeedbackProvider = ({ children }: PropsWithChildren) => {
  const reduced = useReducedMotion();
  const entrance = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const [feedback, setFeedback] = useState<{ message: string; tone: FeedbackTone } | null>(null);
  useEffect(() => {
    if (!feedback) return;
    entrance.setValue(reduced ? 1 : 0);
    const incoming = Animated.timing(entrance, {
      toValue: 1,
      duration: reduced ? 0 : motion.normal,
      easing: motion.ease,
      useNativeDriver: true,
    });
    incoming.start();
    let outgoing: Animated.CompositeAnimation | undefined;
    const timer = setTimeout(() => {
      if (reduced) {
        setFeedback(null);
        return;
      }
      outgoing = Animated.timing(entrance, {
        toValue: 0,
        duration: motion.fast,
        easing: motion.ease,
        useNativeDriver: true,
      });
      outgoing.start(({ finished }) => {
        if (finished) setFeedback((current) => (current === feedback ? null : current));
      });
    }, motion.feedbackHold);
    return () => {
      clearTimeout(timer);
      incoming.stop();
      outgoing?.stop();
    };
  }, [feedback, reduced, entrance]);
  return (
    <C.Provider value={{ show: (message, tone = 'info') => setFeedback({ message, tone }) }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>{children}</View>
        {feedback ? (
          <Animated.View
            accessibilityLiveRegion="polite"
            style={[
              styles.feedback,
              {
                opacity: entrance,
                transform: reduced
                  ? []
                  : [
                      {
                        translateY: entrance.interpolate({
                          inputRange: [0, 1],
                          outputRange: [motion.distance, 0],
                        }),
                      },
                    ],
              },
              toneStyles[feedback.tone],
              { marginBottom: Math.max(insets.bottom, spacing.sm) },
            ]}
          >
            <Animated.View
              style={{
                transform: reduced
                  ? []
                  : [
                      {
                        scale: entrance.interpolate({
                          inputRange: [0, 1],
                          outputRange: [motion.pressScale, 1],
                        }),
                      },
                    ],
              }}
            >
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
            </Animated.View>
            <Text style={[typography.bodySecondary, toneTextStyles[feedback.tone], { flex: 1 }]}>
              {feedback.message}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </C.Provider>
  );
};

const styles = StyleSheet.create({
  feedback: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
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
