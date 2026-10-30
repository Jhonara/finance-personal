import { interpretFinancialText, type DetectedMovement } from './interpret-text';
import { emptyPurchase } from '@/features/inbox/purchase-parser';
import type { ShortcutIntake } from '@/features/inbox/shortcut-intake';

export type AcceptedSharedText = { identity: string; suggestion: DetectedMovement; intake: ShortcutIntake };

function identityFor(text: string) {
  // Distinguishes arriving shares in UI memory, not a financial deduplication key.
  let hash = 2166136261;
  for (const character of text.slice(0, 4000)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `${text.length}-${hash >>> 0}`;
}

export function prepareCaptureText(
  text: string,
  source: 'SHARED_TEXT' | 'IMAGE' | 'PDF' | 'NOTIFICATION',
): AcceptedSharedText | null {
  const suggestion = interpretFinancialText(text, source);
  if (!suggestion) return null;
  const identity = `${source}-${identityFor(text)}`;
  return {
    identity,
    suggestion,
    intake: {
      values: {
        ...emptyPurchase(),
        kind: suggestion.kind === 'EXPENSE' ? 'EXPENSE' : 'OTHER',
        description: suggestion.description ?? '',
        amount: suggestion.amount ?? '',
        currency: suggestion.currency ?? '',
        effectiveDate: suggestion.effectiveDate ?? '',
      },
      identity,
      demo: false,
      source,
    },
  };
}

export function prepareSharedText(text: string) {
  return prepareCaptureText(text, 'SHARED_TEXT');
}
