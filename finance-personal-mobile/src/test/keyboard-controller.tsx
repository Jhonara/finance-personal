import { ScrollView } from 'react-native';
import type { PropsWithChildren } from 'react';

export const KeyboardAwareScrollView = ScrollView;
export function KeyboardProvider({ children }: PropsWithChildren) {
  return children;
}
