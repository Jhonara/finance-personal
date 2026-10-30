export function isAutomaticNetworkRetryAllowed(method?: string): boolean {
  return ['get', 'head', 'options'].includes(method?.toLowerCase() ?? 'get');
}
