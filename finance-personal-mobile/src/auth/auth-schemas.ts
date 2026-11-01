import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});
export const registerSchema = loginSchema
  .extend({
    name: z.string().trim().min(2, 'Ingresa tu nombre.').max(100, 'El nombre es demasiado largo.'),
    lastName: z.string().trim().max(100, 'Los apellidos son demasiado largos.').optional(),
    displayName: z.string().trim().max(50, 'Usa hasta 50 caracteres.').optional(),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmEmail: z.string().min(1, 'Confirma tu correo.'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.'),
  })
  .refine((values) => [values.name, values.lastName].filter(Boolean).join(' ').length <= 100, {
    message: 'El nombre y los apellidos juntos admiten hasta 100 caracteres.',
    path: ['lastName'],
  })
  .refine((values) => values.email === values.confirmEmail, {
    message: 'Los correos no coinciden.',
    path: ['confirmEmail'],
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
