import { z } from 'zod';
import type { components } from '@/api/generated/schema';
import { moneyUnits, requestAmount } from '@/utils/decimal-money';
import { localDateFromNative, nativeFromLocalDate } from '@/utils/local-date';

export const creditAmount = z
  .string()
  .refine(
    (value) => /^\d+(\.\d{1,2})?$/.test(value) && requestAmount(value) !== undefined,
    'Ingresa un monto positivo con hasta 2 decimales.',
  );
const date = z
  .string()
  .refine(
    (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && localDateFromNative(nativeFromLocalDate(value)) === value,
    'Selecciona una fecha válida.',
  );
const integer = z
  .string()
  .refine(
    (v) => /^\d+$/.test(v) && Number.isSafeInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 2147483647,
    'Ingresa un número entero mayor que cero.',
  );
export const termFields = {
  principal: creditAmount,
  annualRate: z
    .string()
    .refine(
      (v) => /^\d+(?:[.,]\d+)?$/.test(v) && Number.isFinite(Number(v.replace(',', '.'))),
      'Ingresa una tasa válida, desde 0.',
    ),
  termMonths: integer,
  paymentDay: integer.refine((v) => Number(v) <= 31, 'Elige un día entre 1 y 31.'),
  disbursementDate: date,
};
export const createCreditSchema = z.object({
  ...termFields,
  name: z.string().trim().min(1, 'Escribe el nombre del crédito.'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Usa una moneda de tres letras, como COP.'),
});
export type CreditTerms = z.infer<typeof createCreditSchema>;
export const paymentSchema = z
  .object({
    amount: creditAmount,
    paymentDate: date,
    extraPrincipalAmount: z
      .string()
      .refine(
        (v) => v === '' || v === '0' || creditAmount.safeParse(v).success,
        'Revisa el abono a capital.',
      ),
  })
  .superRefine((data, ctx) => {
    if ((moneyUnits(data.extraPrincipalAmount) ?? 0n) > (moneyUnits(data.amount) ?? 0n))
      ctx.addIssue({
        code: 'custom',
        path: ['extraPrincipalAmount'],
        message: 'El abono a capital es parte del pago; no puede superarlo.',
      });
    if (data.paymentDate > localDateFromNative(new Date()))
      ctx.addIssue({
        code: 'custom',
        path: ['paymentDate'],
        message: 'La fecha del pago no puede ser futura.',
      });
  });
export const simulationSchema = z
  .object({
    ...termFields,
    currentInstallment: z
      .string()
      .refine(
        (v) => v === '' || (/^\d+$/.test(v) && Number.isSafeInteger(Number(v))),
        'Ingresa el número de la última cuota pagada.',
      ),
    today: date,
    extraAmount: z
      .string()
      .refine((v) => v === '' || creditAmount.safeParse(v).success, 'Ingresa un abono positivo.'),
    extraInstallment: z.string(),
  })
  .superRefine((data, ctx) => {
    if (Number(data.currentInstallment) > Number(data.termMonths))
      ctx.addIssue({
        code: 'custom',
        path: ['currentInstallment'],
        message: 'La cuota no puede superar el plazo.',
      });
    if (
      data.extraAmount &&
      (!integer.safeParse(data.extraInstallment).success ||
        Number(data.extraInstallment) > Number(data.termMonths))
    )
      ctx.addIssue({
        code: 'custom',
        path: ['extraInstallment'],
        message: 'Elige una cuota dentro del plazo.',
      });
  });
export function termsRequest(data: z.infer<typeof simulationSchema> | CreditTerms) {
  return {
    principal: Number(data.principal),
    annualRate: Number(data.annualRate.replace(',', '.')),
    termMonths: Number(data.termMonths),
    paymentDay: Number(data.paymentDay),
    disbursementDate: data.disbursementDate,
  };
}
export function simulationRequest(
  data: z.infer<typeof simulationSchema>,
): components['schemas']['CreditSimulationRequest'] {
  return {
    ...termsRequest(data),
    today: data.today,
    ...(data.currentInstallment === '' ? {} : { currentInstallment: Number(data.currentInstallment) }),
    ...(data.extraAmount ? { extraPayments: { [data.extraInstallment]: Number(data.extraAmount) } } : {}),
  };
}
