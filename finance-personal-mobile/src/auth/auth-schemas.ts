import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, 'Ingresa tu nombre.').max(120, 'El nombre es demasiado largo.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
