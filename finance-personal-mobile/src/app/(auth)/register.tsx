import { useAppTheme } from '@/theme/theme-provider';
import { themedStyleSheet } from '@/theme/themed-styles';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { registerSchema, type RegisterFormValues } from '@/auth/auth-schemas';
import { applyApiFieldErrors, friendlyAuthError } from '@/auth/form-errors';
import { colors, spacing, typography } from '@/theme';
import { Button, Card, Input, Screen } from '@/ui/primitives';
import { AuthIntro } from '@/ui/auth-intro';
import { Disclosure } from '@/ui/disclosure';

export default function RegisterScreen() {
  useAppTheme();
  const { register } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      lastName: '',
      displayName: '',
      email: '',
      confirmEmail: '',
      password: '',
      confirmPassword: '',
    },
  });
  const submit = handleSubmit(async (values) => {
    try {
      await register({
        name: [values.name, values.lastName].filter(Boolean).join(' '),
        firstName: values.name,
        lastName: values.lastName || undefined,
        displayName: values.displayName || undefined,
        email: values.email,
        password: values.password,
      });
    } catch (error) {
      const apiError = applyApiFieldErrors(error, setError);
      setError('root', { message: friendlyAuthError(apiError) });
    }
  });
  return (
    <Screen scroll keyboard>
      <AuthIntro
        title="Crea tu cuenta"
        description="Empieza con tus datos de acceso. Tu perfil puede completarse después."
      />
      <Card style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value, onBlur, ref } }) => (
            <Input
              label="Nombre"
              placeholder="Tu nombre"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              inputRef={ref}
              disabled={isSubmitting}
              error={errors.name?.message}
              autoComplete="given-name"
              textContentType="givenName"
              maxLength={100}
            />
          )}
        />
        <Disclosure title="Apellidos y nombre mostrado · opcional" icon="person-outline">
          <Controller
            control={control}
            name="lastName"
            render={({ field }) => (
              <Input
                label="Apellidos · opcional"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                disabled={isSubmitting}
                error={errors.lastName?.message}
                autoComplete="family-name"
                textContentType="familyName"
                maxLength={100}
              />
            )}
          />
          <Controller
            control={control}
            name="displayName"
            render={({ field }) => (
              <Input
                label="Nombre mostrado · opcional"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                disabled={isSubmitting}
                error={errors.displayName?.message}
                maxLength={50}
                helperText="Lo usaremos en el saludo. Puedes cambiarlo en tu perfil."
              />
            )}
          />
        </Disclosure>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value, onBlur, ref } }) => (
            <Input
              label="Correo electrónico"
              placeholder="tu@correo.com"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              inputRef={ref}
              disabled={isSubmitting}
              error={errors.email?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          )}
        />
        <Controller
          control={control}
          name="confirmEmail"
          render={({ field: { onChange, value, onBlur, ref } }) => (
            <Input
              label="Confirmar email"
              placeholder="Repite tu correo"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              inputRef={ref}
              disabled={isSubmitting}
              error={errors.confirmEmail?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value, onBlur, ref } }) => (
            <Input
              label="Contraseña"
              placeholder="Mínimo 8 caracteres"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              inputRef={ref}
              disabled={isSubmitting}
              error={errors.password?.message}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value, onBlur, ref } }) => (
            <Input
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              inputRef={ref}
              disabled={isSubmitting}
              error={errors.confirmPassword?.message}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />
        {errors.root?.message && (
          <Text accessibilityLiveRegion="polite" style={styles.serverError}>
            {errors.root.message}
          </Text>
        )}
        <Button
          loading={isSubmitting}
          disabled={isSubmitting}
          onPress={() => void submit()}
          accessibilityLabel="Crear cuenta"
        >
          Crear cuenta
        </Button>
      </Card>
      <View style={styles.footer}>
        <Text style={typography.bodySecondary}>¿Ya tienes cuenta?</Text>
        <Link href="/(auth)/login" replace style={styles.link}>
          Iniciar sesión
        </Link>
      </View>
    </Screen>
  );
}

const styles = themedStyleSheet(() => ({
  header: { gap: spacing.sm, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  form: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: spacing.xl, gap: spacing.lg },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  link: {
    ...typography.label,
    color: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  serverError: { ...typography.bodySecondary, color: colors.danger },
}));
