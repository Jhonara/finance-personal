import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/ui/primitives';
import { useReducedMotion } from '@/ui/use-reduced-motion';
import { colors, radius, spacing, typography } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';
import { registerAlertPresenter, type AppAlertRequest } from './app-alert';

function dismiss(request: AppAlertRequest) {
  request.buttons.find((button) => button.style === 'cancel')?.onPress?.();
  request.options?.onDismiss?.();
}

export function ConfirmationProvider({ children }: PropsWithChildren) {
  const reduced = useReducedMotion();
  const active = useRef<AppAlertRequest | null>(null);
  const [request, setRequest] = useState<AppAlertRequest | null>(null);
  useEffect(() => {
    const unregister = registerAlertPresenter((next) => {
      if (active.current) {
        dismiss(next);
        return;
      }
      active.current = next;
      setRequest(next);
    });
    return () => {
      unregister();
      const previous = active.current;
      active.current = null;
      if (previous) dismiss(previous);
    };
  }, []);
  const close = useCallback(() => {
    const previous = active.current;
    if (!previous || previous.options?.cancelable === false) return;
    active.current = null;
    setRequest(null);
    dismiss(previous);
  }, []);
  const choose = (expected: AppAlertRequest, index: number) => {
    const previous = active.current;
    if (!previous || previous !== expected) return;
    // Release the request before invoking its action: a second tap cannot repeat it.
    active.current = null;
    setRequest(null);
    previous.buttons[index]?.onPress?.();
  };
  return (
    <>
      {children}
      <Modal
        visible={request !== null}
        transparent
        animationType={reduced ? 'none' : 'fade'}
        onRequestClose={close}
        statusBarTranslucent
      >
        <SafeAreaView style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={close} accessible={false} />
          {request && (
            <View style={styles.panel} accessibilityViewIsModal>
              <ScrollView contentContainerStyle={styles.content} bounces={false}>
                <Text accessibilityRole="header" style={typography.sectionTitle}>
                  {request.title}
                </Text>
                {request.message ? <Text style={typography.bodySecondary}>{request.message}</Text> : null}
                <View style={styles.actions}>
                  {request.buttons.map((button, index) => (
                    <Button
                      key={`${index}-${button.text}`}
                      accessibilityLabel={button.text}
                      variant={
                        button.style === 'destructive'
                          ? 'outline'
                          : button.style === 'cancel'
                            ? 'secondary'
                            : 'primary'
                      }
                      tone={button.style === 'destructive' ? 'danger' : 'primary'}
                      onPress={() => choose(request, index)}
                    >
                      {button.text ?? 'Entendido'}
                    </Button>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}
const styles = themedStyleSheet(() => ({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  panel: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  content: { padding: spacing.lg, gap: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
}));
