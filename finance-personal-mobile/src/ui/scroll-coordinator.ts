export function createScrollCoordinator() {
  let active: { token: symbol; scroll: (animated: boolean) => void } | undefined;
  return {
    register(scroll: (animated: boolean) => void) {
      const token = Symbol('focused-screen');
      active = { token, scroll };
      return () => {
        if (active?.token === token) active = undefined;
      };
    },
    toTop() {
      active?.scroll(true);
    },
  };
}
