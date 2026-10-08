import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, motion, radius, shadows, spacing, typography } from '@/theme';
import { useReducedMotion } from '@/ui/use-reduced-motion';
import { swipeDismissDirection, type DismissDirection } from './swipe-dismiss';

type FeedbackTone = 'success' | 'error' | 'info' | 'warning';
type Feedback = { message: string; tone: FeedbackTone };

const C = createContext<{ show(message: string, tone?: FeedbackTone): void } | null>(null);

const toneDetails: Record<
  FeedbackTone,
  { title: string; icon: keyof typeof Ionicons.glyphMap; color: string; soft: string }
> = {
  success: { title: 'Listo', icon: 'checkmark-circle', color: colors.success, soft: colors.successSoft },
  error: { title: 'Algo salió mal', icon: 'close-circle', color: colors.danger, soft: colors.dangerSoft },
  warning: { title: 'Ten en cuenta', icon: 'warning', color: colors.warning, soft: colors.warningSoft },
  info: { title: 'Información', icon: 'information-circle', color: colors.info, soft: colors.infoSoft },
};

export const FeedbackProvider = ({ children }: PropsWithChildren) => {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const entrance = useRef(new Animated.Value(0)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const dismissing = useRef(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const show = useCallback((message: string, tone: FeedbackTone = 'info') => {
    setFeedback({ message, tone });
  }, []);
  const context = useMemo(() => ({ show }), [show]);

  const dismiss = useCallback(
    (current: Feedback, direction: DismissDirection = 'up') => {
      if (dismissing.current) return;
      dismissing.current = true;
      if (reduced) {
        setFeedback((shown) => (shown === current ? null : shown));
        return;
      }
      Animated.parallel([
        Animated.timing(entrance, {
          toValue: 0,
          duration: motion.fast,
          easing: motion.ease,
          useNativeDriver: true,
        }),
        Animated.timing(dragX, {
          toValue: direction === 'left' ? -420 : direction === 'right' ? 420 : 0,
          duration: motion.normal,
          easing: motion.ease,
          useNativeDriver: true,
        }),
        Animated.timing(dragY, {
          toValue: direction === 'up' ? -100 : 0,
          duration: motion.normal,
          easing: motion.ease,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setFeedback((shown) => (shown === current ? null : shown));
      });
    },
    [dragX, dragY, entrance, reduced],
  );

  useEffect(() => {
    if (!feedback) return;
    dismissing.current = false;
    entrance.setValue(reduced ? 1 : 0);
    dragX.setValue(0);
    dragY.setValue(0);
    const incoming = Animated.spring(entrance, {
      toValue: 1,
      speed: 18,
      bounciness: 4,
      useNativeDriver: true,
    });
    if (!reduced) incoming.start();
    const timer = setTimeout(() => dismiss(feedback), motion.feedbackHold);
    return () => {
      clearTimeout(timer);
      incoming.stop();
      entrance.stopAnimation();
      dragX.stopAnimation();
      dragY.stopAnimation();
    };
  }, [feedback, reduced, dismiss, entrance, dragX, dragY]);

  const gestures = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 || gesture.dy < -10,
        onPanResponderMove: (_, gesture) => {
          dragX.setValue(gesture.dx);
          dragY.setValue(Math.min(gesture.dy, 0));
        },
        onPanResponderRelease: (_, gesture) => {
          if (!feedback) return;
          const direction = swipeDismissDirection(gesture.dx, gesture.dy);
          if (direction) {
            dismiss(feedback, direction);
            return;
          }
          Animated.parallel([
            Animated.spring(dragX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(dragY, { toValue: 0, useNativeDriver: true }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          dragX.setValue(0);
          dragY.setValue(0);
        },
      }),
    [dismiss, dragX, dragY, feedback],
  );

  const details = feedback ? toneDetails[feedback.tone] : null;
  return (
    <C.Provider value={context}>
      <View style={styles.root}>
        <View style={styles.content}>{children}</View>
        {feedback && details ? (
          <Animated.View
            {...gestures.panHandlers}
            style={[
              styles.feedback,
              { top: insets.top + spacing.sm, borderLeftColor: details.color },
              {
                opacity: entrance,
                transform: [
                  {
                    translateY: Animated.add(
                      dragY,
                      entrance.interpolate({ inputRange: [0, 1], outputRange: [-96, 0] }),
                    ),
                  },
                  { translateX: dragX },
                ],
              },
            ]}
          >
            <View style={[styles.iconBadge, { backgroundColor: details.soft }]}>
              <Ionicons name={details.icon} size={25} color={details.color} />
            </View>
            <View
              style={styles.copy}
              accessibilityLiveRegion={feedback.tone === 'error' ? 'assertive' : 'polite'}
            >
              <Text style={[typography.label, styles.title, { color: details.color }]}>{details.title}</Text>
              <Text style={[typography.bodySecondary, styles.message]}>{feedback.message}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar notificación"
              onPress={() => dismiss(feedback)}
              hitSlop={8}
              style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
            >
              <Ionicons name="close" size={19} color={colors.textMuted} />
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </C.Provider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  feedback: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    minHeight: 76,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderLeftWidth: 4,
    borderRadius: radius.large,
    backgroundColor: colors.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.floating,
    elevation: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: spacing.xxs },
  title: { fontWeight: '700' },
  message: { color: colors.textPrimary, fontSize: 14, lineHeight: 19 },
  close: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  closePressed: { backgroundColor: colors.surfaceSecondary },
});

export const useFeedback = () => {
  const x = useContext(C);
  if (!x) throw Error('FeedbackProvider requerido');
  return x;
};
