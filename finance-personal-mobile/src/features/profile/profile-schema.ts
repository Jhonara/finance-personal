import { z } from 'zod';
export const profileSchema = z
  .object({
    firstName: z.string().trim().max(100, 'El nombre es demasiado largo.'),
    lastName: z.string().trim().max(100, 'Los apellidos son demasiado largos.'),
    displayName: z.string().trim().max(50, 'Usa hasta 50 caracteres para el nombre mostrado.'),
  })
  .refine((value) => !value.lastName || Boolean(value.firstName), {
    path: ['firstName'],
    message: 'Indica tu nombre para guardar los apellidos.',
  })
  .refine((value) => [value.firstName, value.lastName].filter(Boolean).join(' ').length <= 100, {
    path: ['lastName'],
    message: 'El nombre y los apellidos juntos admiten hasta 100 caracteres.',
  });
