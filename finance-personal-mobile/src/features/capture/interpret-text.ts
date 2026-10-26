import { formatLocalDate } from '@/utils/local-date';

export type CaptureSource = 'PASTED_TEXT' | 'SHARED_TEXT' | 'IMAGE' | 'PDF' | 'NOTIFICATION';
export type MovementKind =
  | 'EXPENSE'
  | 'INCOME'
  | 'TRANSFER'
  | 'WITHDRAWAL'
  | 'CREDIT_PAYMENT'
  | 'REFUND'
  | 'REVERSAL'
  | 'UNKNOWN';
export type CaptureConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** Suggestions only. This object must never be passed straight to the ledger. */
export type DetectedMovement = {
  kind: MovementKind;
  amount?: string;
  currency?: string;
  effectiveDate?: string;
  description?: string;
  institution?: string;
  accountHint?: string;
  reference?: string;
  source: CaptureSource;
  confidence: CaptureConfidence;
  warnings: string[];
};

const authSignal = /\b(?:otp|c[oó]digo(?:\s+de\s+(?:verificaci[oó]n|seguridad|acceso))?|clave|contrase(?:n|ñ)a|token|inicia(?:r)?\s+sesi[oó]n|verifica(?:r)?\s+tu\s+cuenta)\b/i;
const transactionSignal = /\b(?:compra(?:ste|s)?|pag(?:aste|o|ó)|pago|abono|recib(?:iste|ido)|consignaci[oó]n|n[oó]mina|salario|transfer(?:encia|iste|ido)|enviaste|retir(?:aste|o|ó)|retiro|devoluci[oó]n|reverso|reversi[oó]n|anulaci[oó]n|d[eé]bito|cr[eé]dito)\b/i;

function classify(text: string): MovementKind {
  if (/\b(?:reverso|reversi[oó]n|anulaci[oó]n)\b/i.test(text)) return 'REVERSAL';
  if (/\b(?:devoluci[oó]n|reembolso|te\s+devolvimos)\b/i.test(text)) return 'REFUND';
  if (/\b(?:cuota|abono|pago)\b.{0,35}\b(?:cr[eé]dito|pr[eé]stamo|tarjeta\s+de\s+cr[eé]dito)\b/i.test(text))
    return 'CREDIT_PAYMENT';
  if (/\b(?:transfer(?:encia|iste|ido)|enviaste|moviste\s+dinero)\b/i.test(text)) return 'TRANSFER';
  if (/\b(?:retir(?:aste|o|ó)|retiro|cajero)\b/i.test(text)) return 'WITHDRAWAL';
  if (/\b(?:recib(?:iste|ido)|consignaci[oó]n|n[oó]mina|salario|te\s+pagaron)\b/i.test(text))
    return 'INCOME';
  if (/\b(?:compra(?:ste|s)?|pag(?:aste|o|ó)|pago|d[eé]bito)\b/i.test(text)) return 'EXPENSE';
  return 'UNKNOWN';
}

function amountValue(raw: string, currency?: string) {
  if (/^\d+$/.test(raw)) return raw;
  if (/^\d+[.,]\d{1,2}$/.test(raw)) return raw.replace(',', '.');
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(raw) && currency !== 'USD')
    return raw.replace(/\./g, '').replace(',', '.');
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(raw)) return raw.replace(/,/g, '');
  return undefined;
}

function extractAmount(text: string): { amount?: string; currency?: string; ambiguous: boolean } {
  const candidates = [...text.matchAll(/\b(COP|USD|EUR|US\$)\s*([0-9]+(?:[.,][0-9]+)*)|(?<!\w)\$\s*([0-9]+(?:[.,][0-9]+)*)/gi)]
    .map((match) => {
      const currency = match[1]?.toUpperCase().replace('US$', 'USD');
      const amount = amountValue(match[2] ?? match[3] ?? '', currency);
      const prefix = text.slice(Math.max(0, match.index! - 30), match.index!).toLowerCase();
      const isBalance = /(?:saldo|disponible|cupo|l[ií]mite|antes|despu[eé]s)\s*(?:actual|final|de\s+tu\s+cuenta)?\s*[:$]?\s*$/.test(prefix);
      const isTotal = /(?:valor|monto|importe|total)\s*(?:por|de)?\s*[:$]?\s*$/.test(prefix);
      return { amount, currency, score: isBalance ? -1 : isTotal ? 1 : 0 };
    })
    .filter((candidate): candidate is { amount: string; currency: string | undefined; score: number } =>
      Boolean(candidate.amount && Number(candidate.amount) > 0 && Number(candidate.amount) <= Number.MAX_SAFE_INTEGER),
    );
  const relevant = candidates.filter((candidate) => candidate.score >= 0);
  if (!relevant.length) return { ambiguous: candidates.length > 0 };
  const topScore = Math.max(...relevant.map((candidate) => candidate.score));
  const top = relevant.filter((candidate) => candidate.score === topScore);
  const distinct = [...new Set(top.map(({ amount, currency }) => `${currency ?? '?'}:${amount}`))];
  if (distinct.length !== 1) return { ambiguous: true };
  return { amount: top[0]!.amount, currency: top[0]!.currency, ambiguous: false };
}

function extractDate(text: string) {
  const dates = [...text.matchAll(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/g)].map((match) => {
    const raw = match[1]!;
    const parts = raw.split(/[/-]/);
    return parts[0]!.length === 4
      ? raw
      : `${parts[2]}-${parts[1]!.padStart(2, '0')}-${parts[0]!.padStart(2, '0')}`;
  });
  const distinct = [...new Set(dates)];
  return distinct.length === 1 && Number(distinct[0]!.slice(0, 4)) >= 1900 &&
    formatLocalDate(distinct[0]!) !== 'Fecha no disponible'
    ? distinct[0]
    : undefined;
}

function safeShortText(value?: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= 120 && !/(?:\d{4,}|https?:|@|cuenta|tarjeta|clave|c[oó]digo)/i.test(trimmed)
    ? trimmed
    : undefined;
}

/** Never returns raw message text, OTPs, card numbers or account numbers. */
export function interpretFinancialText(input: string, source: CaptureSource): DetectedMovement | null {
  const text = input.slice(0, 4000).replace(/\s+/g, ' ').trim();
  if (!text || authSignal.test(text) || !transactionSignal.test(text)) return null;
  const kind = classify(text);
  const { amount, currency, ambiguous } = extractAmount(text);
  const effectiveDate = extractDate(text);
  const description = safeShortText(
    text.match(/\b(?:en|comercio|establecimiento|a\s+favor\s+de)\s*[:\-]?\s+(.+?)(?=\s+(?:el\s+\d|con\b|a\s+las\b|fecha\b|saldo\b|referencia\b)|[.;]|$)/i)?.[1],
  );
  const warnings: string[] = [];
  if (!amount) warnings.push(ambiguous ? 'Hay varios importes o un importe ilegible; elige el correcto.' : 'Falta el importe.');
  if (!currency) warnings.push('Confirma la moneda; el símbolo $ no la identifica.');
  if (!effectiveDate) warnings.push('Confirma la fecha del movimiento.');
  if (kind === 'TRANSFER') warnings.push('Comprueba si fue entre tus propias cuentas antes de registrarla.');
  if (kind === 'REFUND' || kind === 'REVERSAL') warnings.push('Comprueba el movimiento original antes de registrar el ajuste.');
  const confidence: CaptureConfidence =
    kind !== 'UNKNOWN' && amount && currency && effectiveDate && description
      ? 'HIGH'
      : kind !== 'UNKNOWN' && amount && currency
        ? 'MEDIUM'
        : 'LOW';
  return { kind, amount, currency, effectiveDate, description, source, confidence, warnings };
}
