import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, Text } from 'react-native';
import { toApiError } from '@/api/errors';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useCategories } from '@/features/categories/use-categories';
import {
  getDraft,
  useDraft,
  useInboxActions,
  type Draft,
  type DraftFields,
} from '@/features/inbox/inbox-api';
import { emptyPurchase, parsePurchaseText, type PurchaseForm } from '@/features/inbox/purchase-parser';
import { purchaseSourceLabel, type ShortcutIntake } from '@/features/inbox/shortcut-intake';
import { withFormSession, openForm } from '@/features/forms/form-session';
import { hasFormChanges, useUnsavedForm } from '@/features/forms/use-unsaved-form';
import { LinkedTransactionDetail } from '@/features/transactions/linked-transaction-detail';
import { AppAlert } from '@/feedback/app-alert';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { formatLocalDate, localDateFromNative } from '@/utils/local-date';
import { ScreenHeader } from '@/ui/headers';
import { Button, Card, Input, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { FinancialDateField } from '@/ui/financial-date-field';
import { ModalSelector } from '@/ui/modal-selector';
import { Disclosure } from '@/ui/disclosure';
import { colors, spacing, typography } from '@/theme';

const asForm = (draft?: Draft): PurchaseForm =>
  draft?.fields
    ? {
        ...emptyPurchase(),
        ...draft.fields,
        amount: draft.fields.amount == null ? '' : String(draft.fields.amount),
        currency: draft.fields.currency ?? '',
        effectiveDate: draft.fields.effectiveDate ?? '',
      }
    : emptyPurchase();

function PurchaseReviewScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const draftId = id ? Number(id) : undefined;
  const query = useDraft(draftId);
  if (id && (!Number.isSafeInteger(draftId) || draftId! <= 0))
    return (
      <Screen>
        <EmptyState title="Borrador no disponible" description="Vuelve a Por revisar para elegirlo." />
        <Button onPress={() => router.back()}>Volver</Button>
      </Screen>
    );
  if (draftId && !query.data)
    return (
      <Screen>
        <ScreenHeader title="Revisar compra" back onBack={() => router.back()} />
        {query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : <SkeletonRow />}
      </Screen>
    );
  return <PurchaseEditor initial={query.data} />;
}

export function PurchaseEditor({
  initial,
  imported,
  onNewIntake,
}: {
  initial?: Draft;
  imported?: ShortcutIntake;
  onNewIntake?: () => void;
}) {
  const [saved, setSaved] = useState(initial);
  const [stage, setStage] = useState<'edit' | 'review'>(initial ? 'review' : 'edit');
  const [text, setText] = useState('');
  const [analyzed, setAnalyzed] = useState(Boolean(imported));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selector, setSelector] = useState<'account' | 'category' | 'currency' | 'kind' | null>(null);
  const [transaction, setTransaction] = useState<number>();
  const lock = useRef(false);
  const operationEpoch = useRef(0);
  const createRequest = useRef<{ requestKey: string; fields: DraftFields; source?: 'SHORTCUT' } | undefined>(
    undefined,
  );
  const actions = useInboxActions();
  const accounts = useAccounts();
  const categories = useCategories('EXPENSE');
  const { hidden } = usePrivacy();
  const form = useForm<PurchaseForm>({
    defaultValues: initial ? asForm(initial) : (imported?.values ?? emptyPurchase()),
  });
  const values = form.watch();
  const dirty = hasFormChanges(values, form.formState.defaultValues) || Boolean(text);
  const closed = saved?.status === 'POSTED' || saved?.status === 'LINKED';
  const previewOnly = imported?.demo === true;
  const guard = useUnsavedForm({
    dirty: !previewOnly && !closed && (dirty || Boolean(imported && !saved)),
    busy,
    suspended: selector !== null,
  });
  const account = accounts.data?.find((item) => item.id === values.accountId);
  const currencies = [
    ...new Set([
      'COP',
      'USD',
      'EUR',
      ...(accounts.data ?? []).map((item) => item.currency ?? '').filter(Boolean),
    ]),
  ];
  const amountText = (amount?: number, currency?: string) =>
    typeof amount === 'number' && currency ? formatPrivateMoney(amount, currency, hidden) : 'Por completar';
  const fail = (failure: unknown) => {
    const apiError = toApiError(failure);
    for (const [key, message] of Object.entries(apiError.fieldErrors)) {
      const name = key.replace(/^fields\./, '') as keyof PurchaseForm;
      if (name in emptyPurchase() || name === 'accountId' || name === 'categoryId')
        form.setError(name, { message });
    }
    setError(
      apiError.status === 400 || apiError.status === 409 || apiError.status === 404
        ? apiError.message
        : 'No pudimos confirmar el resultado. Actualiza la revisión antes de volver a intentarlo. Tus datos siguen aquí.',
    );
  };
  const run = async (operation: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    operationEpoch.current += 1;
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (failure) {
      fail(failure);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const accept = (draft: Draft) => {
    setSaved(draft);
    form.reset(asForm(draft));
    setText('');
    setStage('review');
  };
  // Returning from the credit/scheduled-payment module refreshes possible links, without editing a form.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const epoch = operationEpoch.current;
      if (saved?.id && stage === 'review' && !closed)
        void getDraft(saved.id)
          .then((draft) => {
            if (active && epoch === operationEpoch.current) setSaved(draft);
          })
          .catch(() => {
            if (active && epoch === operationEpoch.current)
              setError('No pudimos actualizar las coincidencias. Actualiza antes de continuar.');
          });
      return () => {
        active = false;
      };
    }, [saved?.id, stage, closed]),
  );

  const save = form.handleSubmit(
    (data) =>
      void run(async () => {
        if (previewOnly) return;
        let valid = true;
        if (!data.description.trim()) {
          form.setError('description', { message: 'Escribe el comercio o concepto.' });
          valid = false;
        }
        if (data.amount && (!Number.isFinite(Number(data.amount)) || Number(data.amount) <= 0)) {
          form.setError('amount', { message: 'Escribe un importe mayor que cero.' });
          valid = false;
        }
        if (data.effectiveDate && formatLocalDate(data.effectiveDate) === 'Fecha no disponible') {
          form.setError('effectiveDate', { message: 'Revisa la fecha.' });
          valid = false;
        }
        if (!valid) return;
        const fields: DraftFields = {
          ...data,
          description: data.description.trim(),
          amount: data.amount ? Number(data.amount) : undefined,
          currency: data.currency || undefined,
          effectiveDate: data.effectiveDate || undefined,
        };
        let current = saved;
        if (!current?.id) {
          createRequest.current ??= {
            requestKey: imported?.requestKey ?? `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`,
            fields,
            ...(imported ? { source: 'SHORTCUT' as const } : {}),
          };
          current = await actions.create.mutateAsync(createRequest.current);
          setSaved(current);
          // Recover the same create after an uncertain response before applying any later edits.
          if (
            current.status === 'PENDING' &&
            JSON.stringify(createRequest.current.fields) !== JSON.stringify(fields)
          )
            current = await actions.update.mutateAsync({
              id: current.id!,
              version: current.version!,
              fields,
            });
        } else
          current = await actions.update.mutateAsync({ id: current.id, version: current.version!, fields });
        accept(current);
      }),
  );
  const refresh = () =>
    guard.request(
      () =>
        void run(async () => {
          if (saved?.id) accept(await getDraft(saved.id));
        }),
    );
  const confirm = (distinctPurchase = false) =>
    void run(async () => {
      if (saved?.id)
        accept(
          await actions.confirm.mutateAsync({
            id: saved.id,
            version: saved.version!,
            reviewToken: saved.reviewToken!,
            distinctPurchase,
          }),
        );
    });
  const complete =
    saved?.fields?.kind === 'EXPENSE' &&
    saved.fields.amount &&
    saved.fields.effectiveDate &&
    saved.fields.currency &&
    accounts.data?.some((item) => item.active && item.id === saved.fields?.accountId) &&
    categories.data?.some((item) => item.active !== false && item.id === saved.fields?.categoryId);
  const matches = saved?.matches ?? [];
  const edit = () => {
    form.reset(asForm(saved));
    setStage('edit');
    setError('');
  };
  return (
    <Screen entry scroll keyboard style={{ gap: spacing.lg }}>
      <ScreenHeader
        title={
          closed
            ? 'Compra revisada'
            : previewOnly
              ? 'Prueba de Atajos'
              : imported
                ? 'Compra desde Atajos'
                : saved || analyzed
                  ? 'Revisar compra'
                  : 'Pegar aviso de compra'
        }
        subtitle={closed ? 'Puedes consultar el movimiento.' : 'Revisa los datos antes de registrar.'}
        back
        onBack={() => guard.request(() => router.back())}
      />
      {onNewIntake && (
        <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={typography.body}>Llegó otro enlace. Tus cambios actuales siguen aquí.</Text>
          <Button variant="secondary" disabled={busy} onPress={() => guard.request(onNewIntake)}>
            Revisar el nuevo enlace
          </Button>
        </Card>
      )}
      {previewOnly && (
        <Card tone="info" style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={typography.cardTitle}>Conexión de prueba</Text>
          <Text style={typography.bodySecondary}>
            Estos datos son ficticios. Esta pantalla no permite guardarlos ni registrar un gasto.
          </Text>
        </Card>
      )}
      {error ? (
        <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text accessibilityLiveRegion="polite" style={{ ...typography.body, color: colors.danger }}>
            {error}
          </Text>
          {saved?.id && (
            <Button variant="secondary" disabled={busy} onPress={refresh}>
              Actualizar revisión
            </Button>
          )}
        </Card>
      ) : null}
      {closed ? (
        <>
          <EmptyState
            tone="success"
            title={saved.status === 'POSTED' ? 'Gasto registrado' : 'Vinculado al movimiento existente'}
            description={
              saved.status === 'POSTED'
                ? 'Ya se refleja en tu cuenta y tus reportes.'
                : 'No se creó otro gasto.'
            }
          />
          <Button onPress={() => setTransaction(saved.transactionId)}>Ver movimiento</Button>
          <Button variant="secondary" onPress={() => router.replace('/(app)/inbox')}>
            Volver a Por revisar
          </Button>
        </>
      ) : stage === 'edit' ? (
        <>
          {!saved && !analyzed && !imported && (
            <Card style={{ padding: spacing.lg, gap: spacing.md }}>
              <Input
                label="Texto del aviso"
                placeholder="Pega aquí el aviso de compra"
                multiline
                maxLength={4000}
                value={text}
                onChangeText={setText}
                disabled={busy}
              />
              <Text style={typography.caption}>
                Se interpreta en el teléfono. No se guarda el mensaje completo. Evita claves y códigos.
              </Text>
              <Button
                variant="secondary"
                disabled={!text.trim() || busy}
                onPress={() => {
                  Keyboard.dismiss();
                  form.reset(parsePurchaseText(text));
                  setAnalyzed(true);
                  setError('');
                }}
              >
                Revisar datos del texto
              </Button>
            </Card>
          )}
          {saved || analyzed ? (
            <>
              <Text style={typography.bodySecondary}>
                Son sugerencias. Completa o corrige lo que falte; no adivinamos una fecha ni una moneda.
              </Text>
              <SelectField
                label="¿Qué es?"
                value={values.kind === 'EXPENSE' ? 'Compra o gasto' : 'Otro movimiento'}
                disabled={busy}
                onPress={() => setSelector('kind')}
              />
              {values.kind === 'OTHER' && (
                <Text style={typography.caption}>
                  Créditos, ingresos y transferencias se registran en su módulo. Aquí podrás vincularlos
                  cuando ya estén registrados.
                </Text>
              )}
              <Controller
                control={form.control}
                name="description"
                render={({ field }) => (
                  <Input
                    label="Comercio o concepto"
                    value={field.value}
                    onChangeText={field.onChange}
                    maxLength={120}
                    error={form.formState.errors.description?.message}
                    disabled={busy}
                  />
                )}
              />
              <SelectField
                label="Moneda"
                value={values.currency || undefined}
                disabled={busy}
                onPress={() => setSelector('currency')}
              />
              <Controller
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <MoneyInput
                    label="Importe"
                    currency={values.currency || '—'}
                    value={field.value}
                    onChangeText={field.onChange}
                    disabled={busy}
                    error={form.formState.errors.amount?.message}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FinancialDateField
                    label="Fecha de la compra"
                    value={field.value}
                    onChange={(date) => {
                      if (!busy) field.onChange(date);
                    }}
                    maximumDate={localDateFromNative(new Date())}
                    error={form.formState.errors.effectiveDate?.message}
                  />
                )}
              />
              <SelectField
                label="Cuenta"
                value={account?.name}
                disabled={busy}
                onPress={() => setSelector('account')}
              />
              {accounts.isError && <ErrorState onRetry={() => void accounts.refetch()} />}
              {values.kind === 'EXPENSE' && (
                <>
                  <SelectField
                    label="Categoría"
                    value={categories.data?.find((item) => item.id === values.categoryId)?.name}
                    disabled={busy}
                    onPress={() => setSelector('category')}
                  />
                  {categories.isError && <ErrorState onRetry={() => void categories.refetch()} />}
                  {saved?.categorySuggestion && !values.categoryId && (
                    <Button
                      variant="ghost"
                      onPress={() => form.setValue('categoryId', saved.categorySuggestion!.id)}
                    >
                      Usar {saved.categorySuggestion.name} · usada antes en este comercio
                    </Button>
                  )}
                </>
              )}
              {previewOnly ? (
                <Button variant="secondary" onPress={() => router.replace('/(app)/shortcuts')}>
                  Volver a la guía de Atajos
                </Button>
              ) : (
                <>
                  <Button loading={busy} disabled={busy} onPress={save}>
                    {saved ? 'Guardar cambios y revisar' : 'Guardar para revisar'}
                  </Button>
                  <Text style={typography.caption}>Guardar el borrador todavía no cambia tu saldo.</Text>
                </>
              )}
              {!saved && !imported && (
                <Button variant="ghost" disabled={busy} onPress={() => setAnalyzed(false)}>
                  Cambiar texto del aviso
                </Button>
              )}
            </>
          ) : null}
        </>
      ) : (
        <>
          <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text style={typography.cardTitle}>{saved?.fields?.description}</Text>
            <Text style={typography.moneyMedium}>
              {amountText(saved?.fields?.amount, saved?.fields?.currency)}
            </Text>
            <Text style={typography.bodySecondary}>{formatLocalDate(saved?.fields?.effectiveDate)}</Text>
            <Text style={typography.bodySecondary}>
              {accounts.data?.find((item) => item.id === saved?.fields?.accountId)?.name ??
                'Cuenta por completar'}
            </Text>
            {saved?.fields?.kind === 'EXPENSE' && (
              <Text style={typography.caption}>
                {categories.data?.find((item) => item.id === saved?.fields?.categoryId)?.name ??
                  'Categoría por completar'}
              </Text>
            )}
            <Text style={typography.caption}>Origen: {purchaseSourceLabel(saved?.source)}</Text>
            <Button variant="outline" disabled={busy} onPress={edit}>
              Editar datos
            </Button>
          </Card>
          {matches.length ? (
            <>
              <Text style={typography.sectionTitle}>Puede que ya esté anotado</Text>
              <Text style={typography.caption}>
                Coinciden importe y moneda en fechas cercanas (hasta 2 días). Confirma si es la misma
                operación.
              </Text>
              {matches.map((match) => (
                <Card key={`${match.kind}:${match.id}`} style={{ padding: spacing.lg, gap: spacing.sm }}>
                  <Text style={typography.label}>{match.description || 'Movimiento sin concepto'}</Text>
                  <Text style={typography.bodySecondary}>
                    {amountText(match.amount, match.currency)} · {formatLocalDate(match.date, 'compact')}
                  </Text>
                  <Text style={typography.caption}>
                    {match.accountName} ·{' '}
                    {match.kind === 'DRAFT'
                      ? 'Otro borrador'
                      : match.kind === 'SCHEDULED'
                        ? 'Pago fijo por confirmar'
                        : ((
                            {
                              EXPENSE: 'Gasto',
                              INCOME: 'Ingreso',
                              CREDIT_PAYMENT: 'Pago de crédito',
                              TRANSFER: 'Transferencia',
                            } as Record<string, string>
                          )[match.transactionType ?? ''] ?? 'Movimiento registrado')}
                  </Text>
                  {match.kind === 'TRANSACTION' ? (
                    <>
                      <Button variant="ghost" disabled={busy} onPress={() => setTransaction(match.id)}>
                        Ver detalle
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onPress={() =>
                          AppAlert.alert(
                            '¿Es la misma operación?',
                            'Se vinculará este borrador al movimiento existente. No se registrará otro gasto.',
                            [
                              { text: 'Volver', style: 'cancel' },
                              {
                                text: 'Sí, vincular',
                                onPress: () =>
                                  void run(async () => {
                                    accept(
                                      await actions.link.mutateAsync({
                                        id: saved!.id!,
                                        version: saved!.version!,
                                        transactionId: match.id!,
                                      }),
                                    );
                                  }),
                              },
                            ],
                          )
                        }
                      >
                        Ya está registrado
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onPress={() =>
                        match.kind === 'DRAFT'
                          ? openForm('/(app)/purchase-review', { id: String(match.id) })
                          : router.push('/(app)/recurrences')
                      }
                    >
                      {match.kind === 'DRAFT' ? 'Abrir otro borrador' : 'Revisar pago fijo'}
                    </Button>
                  )}
                </Card>
              ))}
            </>
          ) : (
            <Text style={typography.bodySecondary}>
              No encontramos coincidencias con los datos disponibles. Revisa el importe, la fecha y la cuenta.
            </Text>
          )}
          {saved?.fields?.kind === 'OTHER' ? (
            <Disclosure title="Registrar en el módulo correcto" defaultOpen>
              <Text style={typography.bodySecondary}>
                Registra primero el movimiento en su módulo. Al volver, busca la coincidencia y pulsa Ya está
                registrado.
              </Text>
              <Button variant="secondary" onPress={() => router.push('/(app)/credits')}>
                Ir a créditos
              </Button>
              <Button variant="secondary" onPress={() => openForm('/(app)/new-income')}>
                Registrar ingreso
              </Button>
              <Button variant="secondary" onPress={() => openForm('/(app)/new-transfer')}>
                Registrar transferencia
              </Button>
            </Disclosure>
          ) : (
            <>
              {!complete && (
                <Text style={typography.bodySecondary}>
                  Completa importe, fecha, moneda, cuenta y categoría para registrar el gasto.
                </Text>
              )}
              <Button
                loading={busy}
                disabled={busy || !complete || Boolean(error)}
                onPress={() =>
                  matches.length
                    ? AppAlert.alert(
                        '¿Es una compra distinta?',
                        'Revisaste las coincidencias y quieres registrar otro gasto. Confirma solo si es una operación diferente.',
                        [
                          { text: 'Seguir revisando', style: 'cancel' },
                          { text: 'Registrar gasto distinto', onPress: () => confirm(true) },
                        ],
                      )
                    : confirm(false)
                }
              >
                {matches.length ? 'Registrar como gasto distinto' : 'Confirmar y registrar gasto'}
              </Button>
            </>
          )}
          <Button variant="ghost" disabled={busy} onPress={refresh}>
            Actualizar coincidencias
          </Button>
        </>
      )}
      {saved?.id && !closed && (
        <Button
          variant="ghost"
          disabled={busy}
          onPress={() =>
            AppAlert.alert(
              '¿Descartar este borrador?',
              'Se eliminará de Por revisar. Tus movimientos registrados no cambian.',
              [
                { text: 'Conservar', style: 'cancel' },
                {
                  text: 'Descartar borrador',
                  style: 'destructive',
                  onPress: () =>
                    void run(async () => {
                      await actions.discard.mutateAsync({ id: saved.id!, version: saved.version! });
                      router.replace('/(app)/inbox');
                    }),
                },
              ],
            )
          }
        >
          Descartar borrador
        </Button>
      )}
      <LinkedTransactionDetail id={transaction} hidden={hidden} onClose={() => setTransaction(undefined)} />
      <ModalSelector
        visible={selector === 'kind'}
        label="Tipo de movimiento"
        options={[
          { id: 1, label: 'Compra o gasto' },
          { id: 2, label: 'Otro movimiento' },
        ]}
        onSelect={(id) => {
          form.setValue('kind', id === 1 ? 'EXPENSE' : 'OTHER');
          setSelector(null);
        }}
        onClose={() => setSelector(null)}
      />
      <ModalSelector
        visible={selector === 'currency'}
        label="Moneda"
        options={currencies.map((currency, id) => ({ id, label: currency }))}
        onSelect={(id) => {
          const currency = currencies[id]!;
          form.setValue('currency', currency);
          if (account?.currency !== currency) form.setValue('accountId', undefined);
          setSelector(null);
        }}
        onClose={() => setSelector(null)}
      />
      <ModalSelector
        visible={selector === 'account'}
        label="Cuenta"
        loading={accounts.isPending}
        options={(accounts.data ?? [])
          .filter(
            (item) =>
              item.active && item.id !== undefined && (!values.currency || item.currency === values.currency),
          )
          .map((item) => ({ id: item.id!, label: `${item.name} · ${item.currency}` }))}
        onSelect={(id) => {
          form.setValue('accountId', id);
          form.setValue('currency', accounts.data?.find((item) => item.id === id)?.currency ?? '');
          setSelector(null);
        }}
        onClose={() => setSelector(null)}
      />
      <ModalSelector
        visible={selector === 'category'}
        label="Categoría"
        loading={categories.isPending}
        options={(categories.data ?? [])
          .filter((item) => item.active !== false && item.id !== undefined)
          .map((item) => ({ id: item.id!, label: item.name ?? 'Categoría' }))}
        onSelect={(id) => {
          form.setValue('categoryId', id);
          setSelector(null);
        }}
        onClose={() => setSelector(null)}
      />
    </Screen>
  );
}
export default withFormSession(PurchaseReviewScreen);
