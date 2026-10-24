import { emptyPurchase, type PurchaseForm } from './purchase-parser';
import { formatLocalDate } from '@/utils/local-date';

export type ShortcutIntake = {
  values: PurchaseForm;
  requestKey?: string;
  demo: boolean;
  identity: string;
};
type Result = { ok: true; intake: ShortcutIntake } | { ok: false; message: string };
const acceptedKeys = new Set(['v', 'kind', 'description', 'amount', 'currency', 'date', 'id', 'demo']);

/** External links provide suggestions, never account IDs, credentials or permission to post. */
export function parseShortcutIntake(params: Record<string, string | string[] | undefined>): Result {
  const invalid = (message: string): Result => ({ ok: false, message });
  const entries = Object.entries(params).filter(([, value]) => value !== undefined);
  if (entries.some(([key, value]) => !acceptedKeys.has(key) || typeof value !== 'string'))
    return invalid('El enlace contiene datos que no admitimos. Vuelve a crear el atajo con la guía.');
  if (entries.reduce((length, [key, value]) => length + key.length + String(value).length, 0) > 1500)
    return invalid('El enlace es demasiado largo. Comparte solo los datos de una compra.');
  const values = Object.fromEntries(entries) as Record<string, string>;
  if (values.v !== '1') return invalid('Actualiza el enlace usando la guía de Atajos.');
  if (values.demo !== undefined && !['0', '1'].includes(values.demo))
    return invalid('Revisa el enlace de prueba.');
  if (values.kind && !['EXPENSE', 'OTHER'].includes(values.kind))
    return invalid('Revisa el tipo de movimiento.');
  if (
    values.description &&
    (values.description.length > 120 ||
      [...values.description].some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ))
  )
    return invalid('El comercio debe ser un texto corto, sin saltos de línea.');
  if (values.amount && (!/^\d{1,12}(?:\.\d{1,4})?$/.test(values.amount) || Number(values.amount) <= 0))
    return invalid(
      'El importe debe ser mayor que cero, sin separadores de miles y con punto para decimales.',
    );
  if (values.currency && !/^[A-Z]{3}$/.test(values.currency))
    return invalid('La moneda debe usar tres letras, como COP.');
  if (
    values.date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) ||
      Number(values.date.slice(0, 4)) < 1900 ||
      formatLocalDate(values.date) === 'Fecha no disponible')
  )
    return invalid('La fecha debe ser válida y tener formato año-mes-día.');
  if (values.id && !/^[a-zA-Z0-9-]{16,64}$/.test(values.id))
    return invalid('Revisa el identificador de la compra.');
  const form: PurchaseForm = {
    ...emptyPurchase(),
    kind: values.kind === 'EXPENSE' ? 'EXPENSE' : 'OTHER',
    description: values.description?.trim() ?? '',
    amount: values.amount ?? '',
    currency: values.currency ?? '',
    effectiveDate: values.date ?? '',
  };
  const requestKey = values.id ? `shortcut-${values.id}` : undefined;
  const demo = values.demo === '1';
  return {
    ok: true,
    intake: { values: form, requestKey, demo, identity: JSON.stringify([form, requestKey, demo]) },
  };
}

export const purchaseSourceLabel = (source?: string) =>
  source === 'SHORTCUT' ? 'Atajo · datos recibidos' : 'Texto pegado';
