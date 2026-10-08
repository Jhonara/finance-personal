export type DismissDirection = 'left' | 'right' | 'up';

export function swipeDismissDirection(dx: number, dy: number): DismissDirection | null {
  if (Math.abs(dx) > 64) return dx < 0 ? 'left' : 'right';
  if (dy < -48) return 'up';
  return null;
}
