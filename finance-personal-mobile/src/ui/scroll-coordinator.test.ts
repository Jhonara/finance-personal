import { expect, it, vi } from 'vitest';
import { createScrollCoordinator } from './scroll-coordinator';
it('only scrolls the focused screen on an explicit tab reselect', () => {
  const coordinator = createScrollCoordinator();
  const list = vi.fn(),
    detail = vi.fn();
  const leaveList = coordinator.register(list);
  const leaveDetail = coordinator.register(detail);
  leaveList(); // A late cleanup from the previous screen must not remove the detail.
  coordinator.toTop();
  expect(list).not.toHaveBeenCalled();
  expect(detail).toHaveBeenCalledExactlyOnceWith(true);
  leaveDetail();
  coordinator.toTop();
  expect(detail).toHaveBeenCalledTimes(1);
});
it('registering a screen preserves its position until an explicit reselect', () => {
  const coordinator = createScrollCoordinator();
  const scroll = vi.fn();
  coordinator.register(scroll);
  expect(scroll).not.toHaveBeenCalled();
});
