import type { NativeInvocation } from './native-types';
const routes = {
  openIncome: '/(app)/new-income',
  openTransfer: '/(app)/new-transfer',
  openBalances: '/(app)/accounts',
} as const;
export function nativeEntryRoute(invocation: NativeInvocation, owner: string) {
  if (invocation.ownerId !== owner) throw new Error('La acción pertenece a otro usuario.');
  if (!(invocation.name in routes)) return undefined;
  if (Object.keys(invocation.params).length)
    throw new Error('Esta acción se completa dentro de Finance Personal.');
  return routes[invocation.name as keyof typeof routes];
}
export function hasOpenedNativeRoute(pathname: string, route: string) {
  return pathname === route || pathname === route.replace('/(app)', '');
}
