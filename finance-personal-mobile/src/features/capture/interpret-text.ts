import { formatLocalDate } from '@/utils/local-date';

export type CaptureSource = 'PASTED_TEXT' | 'SHARED_TEXT' | 'IMAGE' | 'PDF' | 'NOTIFICATION';
export type MovementKind =
  'EXPENSE' | 'INCOME' | 'TRANSFER' | 'WITHDRAWAL' | 'CREDIT_PAYMENT' | 'REFUND' | 'REVERSAL' | 'UNKNOWN';
export type CaptureConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** Suggestions only. This object must never be passed straight to the ledger. */
export type DetectedMovement = {
  kind: MovementKind;
  amount?: string;
  currency?: string;
  effectiveDate?: string;
  occurredAt?: string;
  description?: string;
  counterparty?: string;
  institution?: string;
  accountHint?: string;
  reference?: string;
  dedupId?: string;
  source: CaptureSource;
  confidence: CaptureConfidence;
  warnings: string[];
};

const authSignal =
  /\b(?:otp|c[oó]digo(?:\s+de\s+(?:verificaci[oó]n|seguridad|acceso))?|clave|contrase(?:n|ñ)a|token|inicia(?:r)?\s+sesi[oó]n|verifica(?:r)?\s+tu\s+cuenta)\b/i;
const transactionSignal =
  /\b(?:compra(?:ste|s)?|pag(?:aste|o|ó)|pago|abono|recib(?:iste|ido)|consignaci[oó]n|n[oó]mina|salario|transfer(?:encia|iste|ido)|enviaste|retir(?:aste|o|ó)|retiro|devoluci[oó]n|reverso|reversi[oó]n|anulaci[oó]n|d[eé]bito|cr[eé]dito)\b/i;

export function captureRejectionReason(
  input: string,
  maxLength = 4000,
): 'EMPTY_TEXT' | 'AUTH_MESSAGE' | 'NO_MOVEMENT' | null {
  const text = input.slice(0, maxLength).replace(/\s+/g, ' ').trim();
  if (!text) return 'EMPTY_TEXT';
  if (authSignal.test(text)) return 'AUTH_MESSAGE';
  return transactionSignal.test(text) ? null : 'NO_MOVEMENT';
}

// Recognition hints only; financial classification remains bank-independent.
const institutionHints = [
  ['Bancolombia', /\bbancolombia\b/i],
  ['Davivienda', /\bdavivienda\b/i],
  ['Banco de Bogotá', /\bbanco\s+de\s+bogot[aá]\b/i],
  ['BBVA', /\bbbva\b/i],
  ['Nequi', /\bnequi\b/i],
  ['Daviplata', /\bdaviplata\b/i],
  ['Nu', /\bnu\s+(?:colombia|bank)\b/i],
] as const;

function advisoryDedupId(kind: MovementKind, amount?: string, currency?: string, date?: string) {
  if (!amount || !currency || !date || kind === 'UNKNOWN') return undefined;
  const value = `${kind}|${amount}|${currency}|${date}`;
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `possible-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function classify(text: string): MovementKind {
  if (/\b(?:reverso|reversi[oó]n|anulaci[oó]n)\b/i.test(text)) return 'REVERSAL';
  if (/\b(?:devoluci[oó]n|reembolso|te\s+devolvimos)\b/i.test(text)) return 'REFUND';
  if (/\b(?:cuota|abono|pago)\b.{0,35}\b(?:cr[eé]dito|pr[eé]stamo|tarjeta\s+de\s+cr[eé]dito)\b/i.test(text))
    return 'CREDIT_PAYMENT';
  if (/\b(?:transfer(?:encia|iste|ido)|enviaste|moviste\s+dinero)\b/i.test(text)) return 'TRANSFER';
  if (/\b(?:retir(?:aste|o|ó)|retiro|cajero)\b/i.test(text)) return 'WITHDRAWAL';
  if (/\b(?:recib(?:iste|ido)|consignaci[oó]n|n[oó]mina|salario|te\s+pagaron)\b/i.test(text)) return 'INCOME';
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
  const candidates = [
    ...text.matchAll(
      /\b(COP|USD|EUR|US\$)\s*\$?\s*([0-9]+(?:[.,][0-9]+)*)|(?<!\w)\$\s*([0-9]+(?:[.,][0-9]+)*)/gi,
    ),
  ]
    .map((match) => {
      const currency = match[1]?.toUpperCase().replace('US$', 'USD');
      const amount = amountValue(match[2] ?? match[3] ?? '', currency);
      const prefix = text.slice(Math.max(0, match.index! - 30), match.index!).toLowerCase();
      const isBalance =
        /(?:saldo|disponible|cupo|l[ií]mite|antes|despu[eé]s)\s*(?:actual|final|de\s+tu\s+cuenta)?\s*[:$]?\s*$/.test(
          prefix,
        );
      const isTotal = /(?:valor|monto|importe|total)\s*(?:por|de)?\s*[:$]?\s*$/.test(prefix);
      return { amount, currency, score: isBalance ? -1 : isTotal ? 1 : 0 };
    })
    .filter((candidate): candidate is { amount: string; currency: string | undefined; score: number } =>
      Boolean(
        candidate.amount &&
        Number(candidate.amount) > 0 &&
        Number(candidate.amount) <= Number.MAX_SAFE_INTEGER,
      ),
    );
  const relevant = candidates.filter((candidate) => candidate.score >= 0);
  if (!relevant.length) return { ambiguous: candidates.length > 0 };
  const topScore = Math.max(...relevant.map((candidate) => candidate.score));
  const top = relevant.filter((candidate) => candidate.score === topScore);
  const distinct = [...new Set(top.map(({ amount, currency }) => `${currency ?? '?'}:${amount}`))];
  if (distinct.length !== 1) return { ambiguous: true };
  return { amount: top[0]!.amount, currency: top[0]!.currency, ambiguous: false };
}

const receiptMonths: Record<string, string> = {
  ene: '01',
  enero: '01',
  jan: '01',
  january: '01',
  feb: '02',
  febrero: '02',
  february: '02',
  mar: '03',
  marzo: '03',
  march: '03',
  abr: '04',
  abril: '04',
  apr: '04',
  april: '04',
  may: '05',
  mayo: '05',
  jun: '06',
  junio: '06',
  june: '06',
  jul: '07',
  julio: '07',
  july: '07',
  ago: '08',
  agosto: '08',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  septiembre: '09',
  set: '09',
  setiembre: '09',
  september: '09',
  oct: '10',
  octubre: '10',
  october: '10',
  nov: '11',
  noviembre: '11',
  november: '11',
  dic: '12',
  diciembre: '12',
  dec: '12',
  december: '12',
};

const receiptMonthPattern =
  'enero|ene|january|jan|february|feb|febrero|march|marzo|mar|april|abril|apr|may|mayo|june|junio|jun|july|julio|jul|august|agosto|aug|ago|september|septiembre|setiembre|sept|sep|set|october|octubre|oct|november|noviembre|nov|december|diciembre|dic|dec';

function extractDate(text: string) {
  const dates = [...text.matchAll(/\b(\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/g)].map(
    (match) => {
      const raw = match[1]!;
      const parts = raw.split(/[/-]/);
      return parts[0]!.length === 4
        ? `${parts[0]}-${parts[1]!.padStart(2, '0')}-${parts[2]!.padStart(2, '0')}`
        : `${parts[2]}-${parts[1]!.padStart(2, '0')}-${parts[0]!.padStart(2, '0')}`;
    },
  );
  const namedMonth = new RegExp(
    `\\b(${receiptMonthPattern})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?[,]?\\s+(\\d{4})\\b`,
    'gi',
  );
  for (const match of text.matchAll(namedMonth)) {
    const month = receiptMonths[match[1]!.toLowerCase()];
    if (month) dates.push(`${match[3]}-${month}-${match[2]!.padStart(2, '0')}`);
  }
  const namedDay = new RegExp(
    `\\b(\\d{1,2})\\s+(?:de\\s+)?(${receiptMonthPattern})\\.?(?:\\s+de)?\\s+(\\d{4})\\b`,
    'gi',
  );
  for (const match of text.matchAll(namedDay)) {
    const month = receiptMonths[match[2]!.toLowerCase()];
    if (month) dates.push(`${match[3]}-${month}-${match[1]!.padStart(2, '0')}`);
  }
  const distinct = [...new Set(dates)];
  return distinct.length === 1 &&
    Number(distinct[0]!.slice(0, 4)) >= 1900 &&
    formatLocalDate(distinct[0]!) !== 'Fecha no disponible'
    ? distinct[0]
    : undefined;
}

function receiptAmount(raw: string) {
  const normalized = raw
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/\s/g, '')
    .replace(/[.,]+$/, '');
  return amountValue(normalized);
}

function receiptSuggestion(input: string, source: 'IMAGE' | 'PDF'): DetectedMovement | null {
  const raw = input.slice(0, 12_000).replace(/\r/g, '');
  // Invoice identifiers are not access codes. OTP/security/login lines remain rejected.
  const authenticationText = raw
    .split('\n')
    .filter(
      (line) =>
        !(
          /\b(?:cufe|cude|c[oó]digo\s+(?:(?:de[l]?\s+)?(?:producto|factura|barras|qr)|[uú]nico\s+(?:de\s+)?factura))\b/i.test(
            line,
          ) && !/\b(?:otp|clave|contrase[nñ]a|token|seguridad|verificaci[oó]n|acceso|sesi[oó]n)\b/i.test(line)
        ),
    )
    .join('\n');
  if (authSignal.test(authenticationText)) return null;

  const hasTotal =
    /\b(?:total(?:\s+(?:venta|a\s+pagar|factura))?|valor\s+(?:total|a\s+pagar)|compra\s+neta)\b/i.test(raw);
  const hasPosSignature =
    /\b(?:redeban|credibanco|data\s*f[oó]no|compra\s+neta|pago\s+sin\s+contacto|aprob(?:aci[oó]n)?|rrn|arqc)\b/i.test(
      raw,
    );
  const hasInvoiceSignature =
    /\b(?:factura|nit|subtotal|iva|inc|tipo\s+de\s+pago|total\s+venta|total\s+a\s+pagar)\b/i.test(raw);
  if (!hasTotal || !(hasPosSignature || hasInvoiceSignature)) return null;

  const lines = raw
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const labels = [
    {
      pattern: /\b(?:total\s+(?:(?:de\s+la\s+)?venta|a\s+pagar|factura)|valor\s+(?:total|a\s+pagar))\b/i,
      priority: 5,
    },
    { pattern: /\btotal\b/i, priority: 4 },
    { pattern: /\bcompra\s+neta\b/i, priority: 3 },
  ];
  const amounts: { amount: string; priority: number; currency?: string }[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    for (const { pattern, priority } of labels) {
      const match = pattern.exec(line);
      if (!match) continue;
      const afterLabel = line.slice(match.index + match[0].length).trim();
      // Tax, tender and item-count totals are not the amount payable.
      if (
        /^(?:de\s+)?(?:iva|inc|impuestos?|retenciones?|descuentos?|productos?|art[ií]culos?|items?|cambio|vueltas|pagado|recibido|efectivo)\b/i.test(
          afterLabel,
        )
      )
        break;
      // Only a numeric continuation may supply a missing total. Never borrow the following IVA/subtotal.
      const moneyText = afterLabel.replace(/^[:=•*\s-]+/, '') || (lines[index + 1] ?? '');
      const tokenMatch = moneyText.match(
        /^(COP|USD|EUR|US\$|\$)?\s*\$?\s*([0-9](?:[0-9OoIl|]|[ \t]*[.,][ \t]*(?=[0-9OoIl|])|\s+(?=\d{3}(?:[.,\s]|$)))*)/i,
      );
      const token = tokenMatch?.[2];
      const amount =
        token && (tokenMatch?.[1] || token.replace(/[.,OoIl|]/g, '').length >= 3)
          ? receiptAmount(token)
          : undefined;
      if (amount && Number(amount) > 0 && Number(amount) <= Number.MAX_SAFE_INTEGER)
        amounts.push({
          amount,
          priority,
          currency: tokenMatch?.[1]?.replace('US$', 'USD').replace('$', '').toUpperCase() || undefined,
        });
      break;
    }
  }
  const topPriority = Math.max(...amounts.map(({ priority }) => priority), -1);
  const topAmounts = [
    ...new Set(amounts.filter(({ priority }) => priority === topPriority).map(({ amount }) => amount)),
  ];
  const topCurrencies = new Set(
    amounts.filter((item) => item.priority === topPriority && item.currency).map((item) => item.currency),
  );
  const amount = topAmounts.length === 1 && topCurrencies.size <= 1 ? topAmounts[0] : undefined;
  const ambiguous = topAmounts.length > 1 || topCurrencies.size > 1;

  const explicitCurrencies = new Set(
    [...raw.matchAll(/\b(COP|USD|EUR)\b|\b(US\$)/gi)].map((match) => match[1]?.toUpperCase() ?? 'USD'),
  );
  const colombianReceipt =
    /\b(?:redeban|credibanco|dian)\b/i.test(raw) ||
    (/\bnit\b/i.test(raw) && /\b(?:iva|inc|tarjeta\s+(?:d[eé]bito|cr[eé]dito))\b/i.test(raw));
  const currency =
    explicitCurrencies.size > 1
      ? undefined
      : explicitCurrencies.size === 1
        ? [...explicitCurrencies][0]
        : colombianReceipt
          ? 'COP'
          : undefined;
  const effectiveDate = extractDate(raw);
  const time = raw
    .match(/\b(?:a\s+las\s+)?([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/)
    ?.slice(1)
    .join(':');
  const occurredAt = effectiveDate && time ? `${effectiveDate}T${time.padStart(5, '0')}:00` : undefined;

  const ignoredMerchantLine =
    /\b(?:redeban|credibanco|compra|venta|total|subtotal|factura|nit|sede|principal|tarjeta|mastercard|visa|d[eé]bito|cr[eé]dito|pago|contacto|comercio|recibo|fecha|iva|inc|aprob|rrn|arqc|caja|cajero|tel[eé]fono|whatsapp|servicio|domicilio|calle|carrera|avenida|barrio|direcci[oó]n|moneda|currency|cop|usd|eur)\b/i;
  const merchantCandidates = lines.flatMap((line, index) => {
    if (!safeShortText(line)) return [];
    const candidate = line
      .replace(/[^\p{L}\p{N}\s&.'-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const valid =
      candidate.length >= 5 &&
      candidate.length <= 80 &&
      /\p{L}{3}/u.test(candidate) &&
      !ignoredMerchantLine.test(candidate);
    return valid ? [{ line, index }] : [];
  });
  const taxIdIndex = lines.findIndex((line) => /^\s*(?:nit|ruc|cuit|rut)\b/i.test(line));
  const identifiedMerchant = merchantCandidates
    .filter(({ index }) => index < taxIdIndex && taxIdIndex - index <= 3)
    .at(-1);
  const merchant = identifiedMerchant?.line ?? merchantCandidates[0]?.line;
  const description = safeShortText(merchant);
  const warnings: string[] = [];
  const correction = lines.some((line) =>
    /^(?:comprobante\s+de\s+)?(?:anulaci[oó]n|reversi[oó]n|reverso|compra\s+anulada)\b/i.test(line),
  );
  const refund = lines.some((line) =>
    /^(?:comprobante\s+de\s+)?(?:devoluci[oó]n\s+(?:de\s+)?(?:compra|pago|venta)|reembolso)\b/i.test(line),
  );
  const kind: MovementKind = correction ? 'REVERSAL' : refund ? 'REFUND' : 'EXPENSE';
  if (kind !== 'EXPENSE') warnings.push('Comprueba el movimiento original antes de registrar el ajuste.');
  if (!amount)
    warnings.push(ambiguous ? 'Hay varios totales posibles; elige el correcto.' : 'Falta el importe total.');
  if (!currency) warnings.push('Confirma la moneda; el comprobante no la identifica con certeza.');
  if (!effectiveDate) warnings.push('Confirma la fecha del movimiento.');

  return {
    kind,
    amount,
    currency,
    effectiveDate,
    occurredAt,
    description,
    counterparty: description,
    dedupId: advisoryDedupId(kind, amount, currency, effectiveDate),
    source,
    confidence:
      amount && currency && effectiveDate && description ? 'HIGH' : amount && currency ? 'MEDIUM' : 'LOW',
    warnings,
  };
}

function safeShortText(value?: string) {
  const trimmed = value?.trim();
  return trimmed &&
    trimmed.length <= 120 &&
    !/(?:\d{4,}|https?:|@|cuenta|tarjeta|clave|c[oó]digo)/i.test(trimmed)
    ? trimmed
    : undefined;
}

/** Never returns raw message text, OTPs, card numbers or account numbers. */
export function interpretFinancialText(input: string, source: CaptureSource): DetectedMovement | null {
  const textLimit = source === 'IMAGE' || source === 'PDF' ? 12_000 : 4_000;
  const text = input.slice(0, textLimit).replace(/\s+/g, ' ').trim();
  if (source === 'IMAGE' || source === 'PDF') {
    const receipt = receiptSuggestion(input, source);
    if (receipt) return receipt;
  }
  if (captureRejectionReason(text, textLimit)) return null;
  const kind = classify(text);
  const { amount, currency, ambiguous } = extractAmount(text);
  const effectiveDate = extractDate(text);
  const time = text
    .match(/\b(?:a\s+las\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/)
    ?.slice(1)
    .join(':');
  const occurredAt = effectiveDate && time ? `${effectiveDate}T${time.padStart(5, '0')}:00` : undefined;
  const institution = institutionHints.find(([, pattern]) => pattern.test(text))?.[0];
  const accountHint = text.match(/(?:\bterminad[ao]\s+en\s*|\*{2,}\s*)(\d{4})\b/i)?.[1];
  const reference = text.match(
    /\b(?:ref(?:erencia)?|comprobante|operaci[oó]n)\s*[:#-]?\s*([A-Z0-9-]{5,30})\b/i,
  )?.[1];
  const description = safeShortText(
    text.match(
      /\b(?:en|comercio|establecimiento|a\s+favor\s+de)\s*[:-]?\s+(.+?)(?=\s+(?:el\s+\d|con\b|a\s+las\b|fecha\b|saldo\b|referencia\b)|[.;]|$)/i,
    )?.[1],
  );
  const warnings: string[] = [];
  if (!amount)
    warnings.push(
      ambiguous ? 'Hay varios importes o un importe ilegible; elige el correcto.' : 'Falta el importe.',
    );
  if (!currency) warnings.push('Confirma la moneda; el símbolo $ no la identifica.');
  if (!effectiveDate) warnings.push('Confirma la fecha del movimiento.');
  if (kind === 'TRANSFER') warnings.push('Comprueba si fue entre tus propias cuentas antes de registrarla.');
  if (kind === 'REFUND' || kind === 'REVERSAL')
    warnings.push('Comprueba el movimiento original antes de registrar el ajuste.');
  const confidence: CaptureConfidence =
    kind !== 'UNKNOWN' && amount && currency && effectiveDate && description
      ? 'HIGH'
      : kind !== 'UNKNOWN' && amount && currency
        ? 'MEDIUM'
        : 'LOW';
  return {
    kind,
    amount,
    currency,
    effectiveDate,
    occurredAt,
    description,
    counterparty: description,
    institution,
    accountHint,
    reference,
    dedupId: advisoryDedupId(kind, amount, currency, effectiveDate),
    source,
    confidence,
    warnings,
  };
}
