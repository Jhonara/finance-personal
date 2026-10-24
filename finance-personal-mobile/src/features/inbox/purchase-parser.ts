import { formatLocalDate } from '@/utils/local-date';

export type PurchaseForm = {
  kind: 'EXPENSE' | 'OTHER';
  description: string;
  amount: string;
  currency: string;
  effectiveDate: string;
  accountId?: number;
  categoryId?: number;
};
export const emptyPurchase = (): PurchaseForm => ({
  kind: 'OTHER',
  description: '',
  amount: '',
  currency: '',
  effectiveDate: '',
});

/** Local suggestions only. Never reads the clipboard, contacts, messages, or bank accounts. */
export function parsePurchaseText(input: string): PurchaseForm {
  const text = input.slice(0, 4000).replace(/\s+/g, ' ').trim();
  const result = emptyPurchase();
  const other =
    /\b(cuota|transferencia|transferiste|recibiste|recibido|salario|nómina|retiro|retiraste|avance|código|codigo|otp)\b|(?:pago|abono).{0,25}cr[eé]dito/i.test(
      text,
    );
  if (!other && /\b(compra|compraste|compró|pagaste)\b/i.test(text)) result.kind = 'EXPENSE';
  const amounts = [...text.matchAll(/(COP|USD|EUR|US\$|\$)\s*([0-9]+(?:[.,][0-9]+)*)(?![0-9]|[.,][0-9])/gi)];
  if (amounts.length === 1) {
    const token = amounts[0]!;
    result.currency = token[1]!.toUpperCase().replace('US$', 'USD').replace('$', '');
    const raw = token[2]!;
    let normalized: string | undefined;
    if (/^\d+$/.test(raw)) normalized = raw;
    else if (/^\d+[.,]\d{1,2}$/.test(raw)) normalized = raw.replace(',', '.');
    else if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(raw) && result.currency !== 'USD')
      normalized = raw.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(raw)) normalized = raw.replace(/,/g, '');
    if (normalized && Number(normalized) > 0 && Number(normalized) <= Number.MAX_SAFE_INTEGER)
      result.amount = normalized;
  }
  const dates = [...text.matchAll(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/g)];
  if (dates.length === 1) {
    const raw = dates[0]![1]!;
    const parts = raw.split(/[/-]/);
    const date =
      parts[0]!.length === 4
        ? raw
        : `${parts[2]}-${parts[1]!.padStart(2, '0')}-${parts[0]!.padStart(2, '0')}`;
    if (formatLocalDate(date) !== 'Fecha no disponible' && Number(date.slice(0, 4)) >= 1900)
      result.effectiveDate = date;
  }
  if (result.kind === 'EXPENSE') {
    const merchant = text
      .match(/\ben\s+(.+?)(?=\s+(?:el\s+\d|con\b|a\s+las\b|fecha\b)|[.;]|$)/i)?.[1]
      ?.trim();
    // Do not copy an entire message or a card/account number into the stored description.
    if (merchant && merchant.length <= 120 && !/\d{4,}|https?:|@|cuenta|tarjeta/i.test(merchant))
      result.description = merchant;
  }
  return result;
}
