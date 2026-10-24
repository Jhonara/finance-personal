import { Alert, type AlertButton, type AlertOptions } from 'react-native';

export type AppAlertRequest = {
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};
let presenter: ((request: AppAlertRequest) => void) | undefined;

export function registerAlertPresenter(next: (request: AppAlertRequest) => void) {
  presenter = next;
  return () => {
    if (presenter === next) presenter = undefined;
  };
}

// Keep the native fallback available before the app root is mounted.
export const AppAlert = {
  alert(...args: Parameters<typeof Alert.alert>) {
    const [title, message, buttons, options] = args;
    if (presenter)
      presenter({ title, message, buttons: buttons?.length ? buttons : [{ text: 'Entendido' }], options });
    else Alert.alert(...args);
  },
};
