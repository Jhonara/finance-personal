import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAccounts } from '@/features/accounts/use-accounts';
import { useCategories } from '@/features/categories/use-categories';
import { colors, radius, spacing, typography } from '@/theme';
import { FinancialDateField } from '@/ui/financial-date-field';
import { ModalSelector, type SelectorOption } from '@/ui/modal-selector';
import { Button, SelectField } from '@/ui/primitives';
import {
  transactionStatusLabels,
  transactionTypeLabels,
  validateTransactionFilters,
  type PeriodMode,
  type TransactionFilters,
  type TransactionStatus,
  type TransactionType,
} from './filters';

type Selector = 'account' | 'category' | 'type' | 'status' | 'year' | 'month' | null;

const years = Array.from({ length: 8 }, (_, index) => new Date().getFullYear() - index);
const months = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function TransactionFiltersModal({
  visible,
  filters,
  onClose,
  onApply,
  onClear,
}: {
  visible: boolean;
  filters: TransactionFilters;
  onClose(): void;
  onApply(filters: TransactionFilters): void;
  onClear(): void;
}) {
  const [draft, setDraft] = useState<TransactionFilters>(filters);
  const [mode, setMode] = useState<PeriodMode>(filters.from || filters.to ? 'range' : 'month');
  const [selector, setSelector] = useState<Selector>(null);
  const [error, setError] = useState<string>();
  const accounts = useAccounts();
  const expenseCategories = useCategories('EXPENSE');
  const incomeCategories = useCategories('INCOME');
  const categories = useMemo(
    () => [...(expenseCategories.data ?? []), ...(incomeCategories.data ?? [])],
    [expenseCategories.data, incomeCategories.data],
  );

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setMode(filters.from || filters.to ? 'range' : 'month');
      setError(undefined);
    }
  }, [filters, visible]);

  const setPeriodMode = (next: PeriodMode) => {
    setMode(next);
    setDraft((current) =>
      next === 'month'
        ? { ...current, from: undefined, to: undefined }
        : { ...current, year: undefined, month: undefined },
    );
    setError(undefined);
  };
  const apply = () => {
    const validation = validateTransactionFilters(draft);
    if (validation) return setError(validation);
    onApply(draft);
  };
  const clear = () => {
    setDraft({});
    setError(undefined);
    onClear();
  };
  const accountOptions: SelectorOption[] = (accounts.data ?? [])
    .filter((account) => account.id !== undefined)
    .map((account) => ({
      id: account.id!,
      label: account.name ?? 'Cuenta',
    }));
  const categoryOptions: SelectorOption[] = categories
    .filter((category) => category.id !== undefined)
    .map((category) => ({
      id: category.id!,
      label: category.name ?? 'Categoría',
    }));
  const typeOptions: SelectorOption[] = (
    Object.entries(transactionTypeLabels) as [TransactionType, string][]
  ).map(([id, label], index) => ({ id: index, label: `${label}|${id}` }));
  const statusOptions: SelectorOption[] = (
    Object.entries(transactionStatusLabels) as [TransactionStatus, string][]
  ).map(([id, label], index) => ({ id: index, label: `${label}|${id}` }));
  const typeLabel = draft.type ? transactionTypeLabels[draft.type] : undefined;
  const statusLabel = draft.status ? transactionStatusLabels[draft.status] : undefined;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <Text style={typography.sectionTitle}>Filtros</Text>
              <View style={styles.modeRow}>
                <ModeButton label="Mes" active={mode === 'month'} onPress={() => setPeriodMode('month')} />
                <ModeButton label="Rango" active={mode === 'range'} onPress={() => setPeriodMode('range')} />
              </View>
              {mode === 'month' ? (
                <>
                  <SelectField
                    label="Año"
                    value={draft.year?.toString()}
                    placeholder="Selecciona un año"
                    onPress={() => setSelector('year')}
                  />
                  <SelectField
                    label="Mes"
                    value={draft.month ? months[draft.month - 1] : undefined}
                    placeholder="Selecciona un mes"
                    onPress={() => setSelector('month')}
                  />
                </>
              ) : (
                <>
                  <FinancialDateField
                    label="Desde"
                    value={draft.from ?? ''}
                    onChange={(from) => setDraft((current) => ({ ...current, from }))}
                  />
                  <FinancialDateField
                    label="Hasta"
                    value={draft.to ?? ''}
                    onChange={(to) => setDraft((current) => ({ ...current, to }))}
                  />
                </>
              )}
              <SelectField
                label="Cuenta"
                value={accountOptions.find((item) => item.id === draft.accountId)?.label}
                placeholder="Todas las cuentas"
                onPress={() => setSelector('account')}
              />
              {draft.accountId !== undefined && (
                <ClearChoice
                  label="Quitar cuenta"
                  onPress={() => setDraft((current) => ({ ...current, accountId: undefined }))}
                />
              )}
              <SelectField
                label="Categoría"
                value={categoryOptions.find((item) => item.id === draft.categoryId)?.label}
                placeholder="Todas las categorías"
                onPress={() => setSelector('category')}
              />
              {draft.categoryId !== undefined && (
                <ClearChoice
                  label="Quitar categoría"
                  onPress={() => setDraft((current) => ({ ...current, categoryId: undefined }))}
                />
              )}
              <SelectField
                label="Tipo"
                value={typeLabel}
                placeholder="Todos los tipos"
                onPress={() => setSelector('type')}
              />
              {draft.type && (
                <ClearChoice
                  label="Quitar tipo"
                  onPress={() => setDraft((current) => ({ ...current, type: undefined }))}
                />
              )}
              <SelectField
                label="Estado"
                value={statusLabel}
                placeholder="Todos los estados"
                onPress={() => setSelector('status')}
              />
              {draft.status && (
                <ClearChoice
                  label="Quitar estado"
                  onPress={() => setDraft((current) => ({ ...current, status: undefined }))}
                />
              )}
              {error && <Text style={styles.error}>{error}</Text>}
              <Button onPress={apply}>Aplicar filtros</Button>
              <Button variant="ghost" onPress={clear}>
                Limpiar filtros
              </Button>
              <Button variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ModalSelector
        visible={selector === 'account'}
        label="Cuenta"
        options={accountOptions}
        loading={accounts.isPending}
        onClose={() => setSelector(null)}
        onSelect={(accountId) => setDraft((current) => ({ ...current, accountId }))}
      />
      <ModalSelector
        visible={selector === 'category'}
        label="Categoría"
        options={categoryOptions}
        loading={expenseCategories.isPending || incomeCategories.isPending}
        onClose={() => setSelector(null)}
        onSelect={(categoryId) => setDraft((current) => ({ ...current, categoryId }))}
      />
      <ModalSelector
        visible={selector === 'year'}
        label="Año"
        options={years.map((year) => ({ id: year, label: String(year) }))}
        onClose={() => setSelector(null)}
        onSelect={(year) => setDraft((current) => ({ ...current, year }))}
      />
      <ModalSelector
        visible={selector === 'month'}
        label="Mes"
        options={months.map((label, index) => ({ id: index + 1, label }))}
        onClose={() => setSelector(null)}
        onSelect={(month) => setDraft((current) => ({ ...current, month }))}
      />
      <ModalSelector
        visible={selector === 'type'}
        label="Tipo"
        options={typeOptions.map(({ id, label }) => ({ id, label: label.split('|')[0]! }))}
        onClose={() => setSelector(null)}
        onSelect={(index) =>
          setDraft((current) => ({
            ...current,
            type: (Object.keys(transactionTypeLabels) as TransactionType[])[index],
          }))
        }
      />
      <ModalSelector
        visible={selector === 'status'}
        label="Estado"
        options={statusOptions.map(({ id, label }) => ({ id, label: label.split('|')[0]! }))}
        onClose={() => setSelector(null)}
        onSelect={(index) =>
          setDraft((current) => ({
            ...current,
            status: (Object.keys(transactionStatusLabels) as TransactionStatus[])[index],
          }))
        }
      />
    </>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.mode, active && styles.modeActive]}
    >
      <Text style={active ? styles.modeTextActive : styles.modeText}>{label}</Text>
    </Pressable>
  );
}
function ClearChoice({ label, onPress }: { label: string; onPress(): void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Text style={styles.clear}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(30,42,49,0.3)' },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    backgroundColor: colors.background,
  },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxxl },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  mode: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
  },
  modeActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  modeText: { ...typography.label },
  modeTextActive: { ...typography.label, color: colors.primary },
  clear: { ...typography.caption, color: colors.primary },
  error: { ...typography.caption, color: colors.danger },
});
