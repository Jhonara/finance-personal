import { useContext, useEffect, useRef, type PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { TourScrollContext, useTour } from '@/features/onboarding/tour-context';
import { colors } from '@/theme';

export function TourTarget({
  id,
  children,
  style,
}: PropsWithChildren<{ id: string; style?: StyleProp<ViewStyle> }>) {
  const tour = useTour();
  const scroll = useContext(TourScrollContext);
  const ref = useRef<View>(null);
  const active = tour?.activeTarget === id;
  const report = tour?.reportTarget;
  useEffect(() => {
    if (!active) return;
    report?.(id, true);
    return () => report?.(id, false);
  }, [active, id, report]);
  useEffect(() => {
    if (!active || !scroll) return;
    const timer = setTimeout(() => {
      ref.current?.measureInWindow((_x, y) => {
        scroll.ref.current?.scrollTo({ y: Math.max(0, scroll.offset.current + y - 110), animated: false });
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [active, scroll]);
  return (
    <View ref={ref} collapsable={false} style={style} onTouchEnd={active ? () => tour?.pause() : undefined}>
      {children}
      {active && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -5,
            bottom: -5,
            left: -5,
            right: -5,
            borderWidth: 3,
            borderColor: colors.success,
            borderRadius: 22,
          }}
        />
      )}
    </View>
  );
}
