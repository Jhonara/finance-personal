import { interpretFinancialText } from '@/features/capture/interpret-text';

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

/** The existing review form uses a subset of the common capture suggestion. */
export function parsePurchaseText(input: string): PurchaseForm {
  const detected = interpretFinancialText(input, 'PASTED_TEXT');
  if (!detected) return emptyPurchase();
  return {
    ...emptyPurchase(),
    kind: detected.kind === 'EXPENSE' ? 'EXPENSE' : 'OTHER',
    description: detected.description ?? '',
    amount: detected.amount ?? '',
    currency: detected.currency ?? '',
    effectiveDate: detected.effectiveDate ?? '',
  };
}
