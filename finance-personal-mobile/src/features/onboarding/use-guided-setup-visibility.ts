import { useEffect, useState } from 'react';
import { firstRunStorage } from './first-run-storage';

type Visibility = { userId: number; dismissed: boolean };

export function useGuidedSetupVisibility(userId: number | undefined) {
  const [visibility, setVisibility] = useState<Visibility>();

  useEffect(() => {
    if (userId === undefined) return;
    let cancelled = false;
    const resolve = (dismissed: boolean) => {
      if (!cancelled) {
        setVisibility((current) =>
          current?.userId === userId && current.dismissed ? current : { userId, dismissed },
        );
      }
    };
    void firstRunStorage.read(firstRunStorage.completionKey(userId)).then(
      (value) => resolve(value === 'done'),
      () => resolve(false),
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function dismiss() {
    if (userId === undefined) return false;
    setVisibility({ userId, dismissed: true });
    try {
      await firstRunStorage.mark(firstRunStorage.completionKey(userId));
      return true;
    } catch {
      setVisibility((current) => (current?.userId === userId ? { userId, dismissed: false } : current));
      return false;
    }
  }

  return {
    visible: userId !== undefined && visibility?.userId === userId && !visibility.dismissed,
    dismiss,
  };
}
