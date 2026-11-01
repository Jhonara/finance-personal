import { themedStyleSheet } from '@/theme/themed-styles';
import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '@/theme';
import { useAppTheme } from '@/theme/theme-provider';
import { MotionPressable } from './motion';
import { CenterActionButton } from './center-action';
import { useReducedMotion } from './use-reduced-motion';
import { dockIndex, dockItems } from './navigation-model';
import { requestFormExit } from '@/features/forms/use-unsaved-form';
import { useTabScrollToTop } from './scroll-policy';

type DockProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
export function NavigationDock({ state, descriptors, emitter, navigateToTab }: DockProps) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, fontScale = 1 } = useWindowDimensions();
  const scrollToTop = useTabScrollToTop();
  const barHeight = Math.max(74, 54 + Math.min(fontScale, 2) * 20);
  const [keyboard, setKeyboard] = useState(false);
  const [barWidth, setBarWidth] = useState(width - 24);
  const reduced = useReducedMotion();
  const focused = state.routes[state.index]!;
  const selected = dockIndex(focused.name);
  const slot = (barWidth - 12) / 5;
  const position = useSharedValue(Math.max(0, selected) * slot);
  useEffect(() => {
    if (selected < 0) return;
    const next = selected * slot;
    position.value = reduced ? next : withSpring(next, { damping: 22, stiffness: 210, mass: 0.8 });
  }, [position, reduced, selected, slot]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const options = descriptors[focused.key]?.options;
  const barStyle = StyleSheet.flatten(options?.tabBarStyle);
  if (keyboard || (barStyle && 'display' in barStyle && barStyle.display === 'none')) return null;
  return (
    <View
      style={{
        paddingBottom: Math.max(insets.bottom, 8),
        paddingHorizontal: 12,
        paddingTop: 10,
        backgroundColor: palette.background,
      }}
    >
      <View
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={[styles.bar, { height: barHeight }]}
      >
        {selected >= 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.indicator, { width: slot - 4, height: barHeight - 14 }, indicator]}
          />
        ) : null}
        {dockItems.map((item, index) => {
          if (item.name === 'action') return <CenterActionButton key={item.name} dark />;
          const route = state.routes.find((candidate) => candidate.name === item.name);
          if (!route) return null;
          const active = selected === index;
          return (
            <MotionPressable
              key={item.name}
              accessibilityRole="button"
              accessibilityLabel={item.accessibilityLabel}
              accessibilityState={{ selected: active }}
              style={styles.item}
              onPress={() => {
                const event = emitter.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (event.defaultPrevented) return;
                if (focused.key === route.key) scrollToTop?.();
                else requestFormExit(() => navigateToTab(route.key));
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            >
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={24}
                color={active ? colors.mint : colors.navMuted}
              />
              <Text
                numberOfLines={2}
                style={[styles.label, { color: active ? colors.navText : colors.navMuted }]}
              >
                {item.name === 'transactions' && width / fontScale <= 240
                  ? 'Mov.'
                  : item.name === 'transactions' && width / fontScale <= 360
                    ? 'Movim.'
                    : item.name === 'accounts' && width / fontScale <= 240
                      ? 'Ctas.'
                      : item.label}
              </Text>
              {active && <View style={styles.dot} />}
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
}
const styles = themedStyleSheet(() => ({
  bar: {
    height: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderRadius: 28,
    backgroundColor: colors.navBackground,
    borderWidth: 1,
    borderColor: '#31555B',
    shadowColor: '#002B32',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  indicator: {
    position: 'absolute',
    left: 8,
    top: 7,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.navActive,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60, gap: 3 },
  label: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
    width: '92%',
    textAlign: 'center',
    fontWeight: '600',
  },
  dot: {
    position: 'absolute',
    bottom: 0,
    width: 14,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.mint,
  },
}));
