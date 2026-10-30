import { z } from 'zod';
import { requestAmount } from './savings-money';
import { localDateFromNative, nativeFromLocalDate } from '@/utils/local-date';

const amount = z
  .string()
  .refine(
    (value) => requestAmount(value) !== undefined,
    'Ingresa un monto positivo con hasta 4 decimales que pueda guardarse sin redondeo.',
  );
export const savingGoalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ponle un nombre a tu meta.')
    .max(100, 'Usa un nombre de hasta 100 caracteres.'),
  targetAmount: amount,
});
export const savingContributionSchema = z.object({
  amount,
  movementDate: z
    .string()
    .refine(
      (value) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value) && localDateFromNative(nativeFromLocalDate(value)) === value,
      'Selecciona una fecha válida.',
    ),
});
