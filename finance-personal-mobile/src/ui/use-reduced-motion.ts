import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    let receivedChange = false;
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (value) => {
        if (active && !receivedChange) setReduced(value);
      },
      () => {},
    );
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      receivedChange = true;
      if (active) setReduced(value);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
