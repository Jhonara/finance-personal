import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '@/theme';
import { MotionPressable } from './motion';
import { CenterActionButton } from './center-action';
import { useReducedMotion } from './use-reduced-motion';
import { dockIndex, dockItems } from './navigation-model';

type DockProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
export function NavigationDock({ state, descriptors, navigation }: DockProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [keyboard, setKeyboard] = useState(false);
  const [barWidth, setBarWidth] = useState(width - 24);
  const reduced = useReducedMotion();
  const focused = state.routes[state.index]!;
  const selected = dockIndex(focused.name);
  const slot = (barWidth - 12) / 5;
  const position = useSharedValue(selected * slot);
  useEffect(() => {
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
        backgroundColor: colors.background,
      }}
    >
      <View onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)} style={styles.bar}>
        <Animated.View pointerEvents="none" style={[styles.indicator, { width: slot - 4 }, indicator]} />
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
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (focused.key !== route.key && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            >
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={24}
                color={active ? colors.mint : '#B9D2D4'}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[styles.label, { color: active ? '#FFFFFF' : '#B9D2D4' }]}
              >
                {item.name === 'transactions' && width <= 360 ? 'Movim.' : item.label}
              </Text>
              {active && <View style={styles.dot} />}
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  bar: {
    height: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderRadius: 28,
    backgroundColor: '#0C3037',
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
    backgroundColor: '#28555B',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60, gap: 3 },
  label: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
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
});
