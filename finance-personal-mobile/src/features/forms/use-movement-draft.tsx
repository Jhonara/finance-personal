import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuth } from '@/auth/auth-provider';
import { toApiError } from '@/api/errors';
import { getCurrentUser } from '@/features/profile/profile-api';
import { currentUserKeys } from '@/features/profile/profile-keys';
import { Button, Screen } from '@/ui/primitives';
import { EmptyState, SkeletonRow } from '@/ui/states';
import { colors, spacing, typography } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';
import { MovementFormHeader } from '@/ui/movement-form';
import {
  createMovementDraftSession,
  isMovementDraftFilled,
  type MovementDraftKind,
  type MovementDraftValues,
} from './movement-draft-storage';

type FinancialForm = {
  amount: string;
  accountId?: number;
  categoryId?: number;
  description: string;
};

export function MovementDraftGate({
  kind,
  children,
}: {
  kind: MovementDraftKind;
  children: (userId: number) => ReactNode;
}) {
  const { state, logout } = useAuth();
  const owner = useQuery({
    queryKey: currentUserKeys.current(),
    queryFn: getCurrentUser,
    enabled: state.status === 'authenticated',
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  useEffect(() => {
    if (owner.error && toApiError(owner.error).status === 401) void logout();
  }, [owner.error, logout]);
  if (state.status !== 'authenticated' || owner.isPending || owner.isFetching)
    return (
      <Screen>
        <SkeletonRow />
      </Screen>
    );
  const userId = owner.data?.id;
  if (owner.isError || !Number.isSafeInteger(userId) || !userId || userId <= 0)
    return (
      <Screen>
        <EmptyState
          title="No pudimos verificar tu cuenta"
          description="Conéctate e inténtalo otra vez para proteger tus borradores."
        />
        <Button onPress={() => void owner.refetch()}>Reintentar</Button>
      </Screen>
    );
  return (
    <View key={`${userId}:${kind}`} style={styles.gate}>
      {children(userId)}
    </View>
  );
}

export function useMovementDraft<T extends FinancialForm>(
  form: UseFormReturn<T>,
  userId: number,
  kind: MovementDraftKind,
  dateField: 'expenseDate' | 'incomeDate',
  initialDate: string,
) {
  const session = useMemo(() => createMovementDraftSession(userId, kind), [userId, kind]);
  const [mode, setMode] = useState<'loading' | 'choice' | 'editing' | 'error'>('loading');
  const [saved, setSaved] = useState<MovementDraftValues | null>(null);
  const [saveError, setSaveError] = useState(false);
  const values = useWatch({ control: form.control });

  useEffect(() => {
    let mounted = true;
    void session.load().then(
      (draft) => {
        if (!mounted) return;
        setSaved(draft);
        setMode(draft ? 'choice' : 'editing');
      },
      () => {
        if (mounted) setMode('error');
      },
    );
    return () => {
      mounted = false;
    };
  }, [session]);

  const persist = () => {
    const current = form.getValues() as FinancialForm & { expenseDate?: string; incomeDate?: string };
    const draft: MovementDraftValues = {
      amount: current.amount ?? '',
      accountId: current.accountId,
      categoryId: current.categoryId,
      date: current[dateField] ?? initialDate,
      description: current.description ?? '',
    };
    return isMovementDraftFilled(draft, initialDate) ? session.save(draft) : session.clear();
  };
  useEffect(() => {
    if (mode !== 'editing') return;
    const operation = persist();
    void operation.then(
      () => setSaveError(false),
      () => setSaveError(true),
    );
  }, [mode, values, form, session, dateField, initialDate]);

  const continueDraft = () => {
    if (!saved) return;
    form.reset({
      amount: saved.amount,
      accountId: saved.accountId,
      categoryId: saved.categoryId,
      [dateField]: saved.date,
      description: saved.description,
    } as T);
    setMode('editing');
  };
  const createNew = async () => {
    setMode('loading');
    try {
      await session.clear();
      setSaved(null);
      setMode('editing');
    } catch {
      setMode('error');
    }
  };
  const retry = async () => {
    setMode('loading');
    try {
      const restored = await session.load();
      setSaved(restored);
      setMode(restored ? 'choice' : 'editing');
    } catch {
      setMode('error');
    }
  };
  return {
    mode,
    saveError,
    continueDraft,
    createNew,
    retry,
    finish: () => session.finish(),
    async flush() {
      try {
        await persist();
        setSaveError(false);
        return true;
      } catch {
        setSaveError(true);
        return false;
      }
    },
  };
}

export function MovementDraftStatus({
  kind,
  mode,
  onContinue,
  onNew,
  onRetry,
}: {
  kind: MovementDraftKind;
  mode: 'loading' | 'choice' | 'editing' | 'error';
  onContinue: () => void;
  onNew: () => void;
  onRetry: () => void;
}) {
  if (mode === 'editing') return null;
  if (mode === 'loading')
    return (
      <Screen>
        <SkeletonRow />
      </Screen>
    );
  if (mode === 'error')
    return (
      <Screen>
        <EmptyState
          title="No pudimos abrir tu borrador"
          description="Puedes volver a intentarlo o descartar el borrador de este movimiento."
        />
        <Button onPress={onRetry}>Reintentar</Button>
        <Button variant="secondary" onPress={onNew}>
          Descartar borrador y crear nuevo
        </Button>
      </Screen>
    );
  return (
    <Screen entry>
      <View style={styles.choice}>
        <MovementFormHeader
          title={kind === 'expense' ? 'Nuevo gasto' : 'Nuevo ingreso'}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/(app)'))}
        />
        <Text style={styles.title}>Tienes un {kind === 'expense' ? 'gasto' : 'ingreso'} sin guardar</Text>
        <Text style={styles.caption}>
          Puedes retomarlo o empezar otro movimiento. Nada se ha registrado aún.
        </Text>
        <Button onPress={onContinue}>Continuar borrador</Button>
        <Button variant="secondary" onPress={onNew}>
          Crear nuevo movimiento
        </Button>
      </View>
    </Screen>
  );
}

const styles = themedStyleSheet(() => ({
  gate: { flex: 1 },
  choice: { gap: spacing.lg, paddingTop: spacing.xl },
  title: { ...typography.screenTitle, color: colors.text },
  caption: { ...typography.body, color: colors.textMuted },
}));
