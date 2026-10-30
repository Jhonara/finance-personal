import { describe, expect, it } from 'vitest';
import { swipeDismissDirection } from './swipe-dismiss';

describe('gestures for floating notifications', () => {
  it('dismisses a deliberate swipe to either side or upward', () => {
    expect(swipeDismissDirection(-80, 0)).toBe('left');
    expect(swipeDismissDirection(80, 0)).toBe('right');
    expect(swipeDismissDirection(0, -60)).toBe('up');
  });

  it('keeps the notification visible after a tap, small drag or downward scroll', () => {
    expect(swipeDismissDirection(0, 0)).toBeNull();
    expect(swipeDismissDirection(30, -20)).toBeNull();
    expect(swipeDismissDirection(0, 80)).toBeNull();
  });
});
