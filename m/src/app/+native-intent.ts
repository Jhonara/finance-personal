/** Expo Sharing hands ACTION_SEND to this route without putting financial text in a URL. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (new URL(path).hostname === 'expo-sharing') return '/shared-capture';
  } catch {
    // Expo Router also passes ordinary relative paths here.
  }
  return path;
}
