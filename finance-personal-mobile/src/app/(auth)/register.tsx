import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { registerSchema, type RegisterFormValues } from '@/auth/auth-schemas';
import { applyApiFieldErrors, friendlyAuthError } from '@/auth/form-errors';
import { colors, spacing, typography } from '@/theme';
import { Button, Input, Screen } from '@/ui/primitives';

export default function RegisterScreen() {
  const { register } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const submit = handleSubmit(async (values) => {
    try {
      await register(values);
    } catch (error) {
      const apiError = applyApiFieldErrors(error, setError);
      setError('root', { message: friendlyAuthError(apiError) });
    }
  });
  return (
    <Screen scroll keyboard>
      <View style={styles.header}>
        <Text style={typography.screenTitle}>Crea tu cuenta</Text>
        <Text style={typography.bodySecondary}>Empieza a organizar tu dinero con claridad.</Text>
      </View>
      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Nombre"
              placeholder="Tu nombre"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
              autoComplete="name"
              textContentType="name"
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Email"
              placeholder="tu@correo.com"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
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
          name="password"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Contraseña"
              placeholder="Mínimo 8 caracteres"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
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
      </View>
      <View style={styles.footer}>
        <Text style={typography.bodySecondary}>¿Ya tienes cuenta?</Text>
        <Link href="/(auth)/login" replace style={styles.link}>
          Iniciar sesión
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  form: { gap: spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingTop: spacing.xxl },
  link: { ...typography.label, color: colors.primary },
  serverError: { ...typography.bodySecondary, color: colors.danger },
});
