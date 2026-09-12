export const currentUserKeys = {
  all: ['current-user'] as const,
  current: () => currentUserKeys.all,
};
