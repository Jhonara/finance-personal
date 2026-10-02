import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAccounts } from '@/features/accounts/use-accounts';
import { openForm } from '@/features/forms/form-session';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { firstRunStorage } from '@/features/onboarding/first-run-storage';
import { useFeedback } from '@/feedback/feedback-provider';
import { colors, radius, spacing, typography } from '@/theme';
import { QuickActionModal } from '@/ui/actions';
import { MotionModal } from '@/ui/motion-modal';
import { Button } from '@/ui/primitives';

type QuickActionContextValue = { open(): void; openedCount: number; active: boolean };
const QuickActionContext = createContext<QuickActionContextValue | null>(null);

export function useQuickActions() {
  const value = useContext(QuickActionContext);
  if (!value) throw new Error('QuickActionProvider requerido');
  return value;
}

export function QuickActionProvider({ children }: PropsWithChildren) {
  const accounts = useAccounts();
  const currentUser = useCurrentUser();
  const feedback = useFeedback();
  const opening = useRef(false);
  const [quickActions, setQuickActions] = useState(false);
  const [noAccounts, setNoAccounts] = useState(false);
  const [openedCount, setOpenedCount] = useState(0);
  const canTransfer = useMemo(
    () =>
      Boolean(
        accounts.data?.some(
          (account, index, all) =>
            account.active &&
            all.some(
              (candidate, candidateIndex) =>
                candidateIndex !== index && candidate.active && candidate.currency === account.currency,
            ),
        ),
      ),
    [accounts.data],
  );
  const open = useCallback(() => {
    if (opening.current || quickActions || noAccounts) return;
    opening.current = true;
    void (async () => {
      try {
        const result = accounts.data ? accounts : await accounts.refetch();
        if (result.isError || !result.data) {
          feedback.show('No pudimos cargar tus cuentas. Inténtalo nuevamente.', 'error');
          return;
        }
        setOpenedCount((count) => count + 1);
        if (currentUser.data?.id) {
          void firstRunStorage.mark(firstRunStorage.hintKey(currentUser.data.id, 'fab'));
        }
        if (result.data.some((account) => account.active)) setQuickActions(true);
        else setNoAccounts(true);
      } finally {
        opening.current = false;
      }
    })();
  }, [accounts, currentUser.data?.id, feedback, noAccounts, quickActions]);
  const navigate = (route: '/(app)/new-expense' | '/(app)/new-income' | '/(app)/new-transfer') => {
    setQuickActions(false);
    openForm(route);
  };
  return (
    <QuickActionContext.Provider value={{ open, openedCount, active: quickActions }}>
      {children}
      <QuickActionModal
        visible={quickActions}
        onClose={() => setQuickActions(false)}
        onExpense={() => navigate('/(app)/new-expense')}
        onIncome={() => navigate('/(app)/new-income')}
        onTransfer={() => navigate('/(app)/new-transfer')}
        canTransfer={canTransfer}
      />
      <MotionModal transparent visible={noAccounts} onRequestClose={() => setNoAccounts(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={typography.sectionTitle}>Primero crea una cuenta</Text>
            <Text style={typography.bodySecondary}>Necesitas una cuenta para registrar tus movimientos.</Text>
            <Button
              onPress={() => {
                setNoAccounts(false);
                openForm('/(app)/account-form');
              }}
            >
              Crear cuenta
            </Button>
            <Button variant="ghost" onPress={() => setNoAccounts(false)}>
              Cancelar
            </Button>
          </View>
        </View>
      </MotionModal>
    </QuickActionContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.overlay },
  card: { gap: spacing.md, padding: spacing.xl, borderRadius: radius.large, backgroundColor: colors.surface },
});
