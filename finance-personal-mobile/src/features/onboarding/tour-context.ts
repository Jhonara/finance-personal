import { createContext, useContext } from 'react';
import type { RefObject } from 'react';
import type { ScrollView } from 'react-native';

export const TourContext = createContext<{
  activeTarget?: string;
  active: boolean;
  start(restart?: boolean): void;
  pause(): void;
  completeStep?(target: string): void;
  reportTarget?(id: string, present: boolean): void;
} | null>(null);
export const useTour = () => useContext(TourContext);
export const TourScrollContext = createContext<{
  ref: RefObject<ScrollView | null>;
  offset: RefObject<number>;
} | null>(null);
