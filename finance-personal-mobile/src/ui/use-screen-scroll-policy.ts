import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useScrollCoordinator } from './scroll-policy';

export function useScreenScrollPolicy(scroll: (animated: boolean) => void, resetKey?: string) {
  const coordinator = useScrollCoordinator();
  const previous = useRef(resetKey);
  useFocusEffect(useCallback(() => coordinator?.register(scroll), [coordinator, scroll]));
  useEffect(() => {
    if (previous.current !== resetKey) {
      previous.current = resetKey;
      scroll(false);
    }
  }, [resetKey, scroll]);
}
