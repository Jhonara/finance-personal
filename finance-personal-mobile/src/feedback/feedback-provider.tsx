import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { Text } from 'react-native';
const C = createContext<{ show(message: string): void } | null>(null);
export const FeedbackProvider = ({ children }: PropsWithChildren) => {
  const [m, setM] = useState('');
  return (
    <C.Provider value={{ show: setM }}>
      {children}
      {m ? <Text accessibilityLiveRegion="polite">{m}</Text> : null}
    </C.Provider>
  );
};
export const useFeedback = () => {
  const x = useContext(C);
  if (!x) throw Error('FeedbackProvider requerido');
  return x;
};
