import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { loginSchema, type LoginFormValues } from '@/auth/auth-schemas';
import { applyApiFieldErrors, friendlyAuthError } from '@/auth/form-errors';
import { colors, spacing, typography } from '@/theme';
import { Button, Input, Screen } from '@/ui/primitives';

export default function LoginScreen() {
  const { login } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const submit = handleSubmit(async (values) => {
    try {
      await login(values);
    } catch (error) {
      const apiError = applyApiFieldErrors(error, setError);
      setError('root', { message: friendlyAuthError(apiError) });
    }
  });
  return (
    <Screen scroll keyboard>
      <View style={styles.hero}>
        <Text style={typography.display}>Finance Personal</Text>
        <Text style={typography.bodySecondary}>Organiza tu dinero con claridad.</Text>
      </View>
      <View style={styles.form}>
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
              placeholder="Tu contraseña"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
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
          accessibilityLabel="Iniciar sesión"
        >
          Iniciar sesión
        </Button>
      </View>
      <View style={styles.footer}>
        <Text style={typography.bodySecondary}>¿No tienes cuenta?</Text>
        <Link href="/(auth)/register" replace style={styles.link}>
          Crear cuenta
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, paddingTop: spacing.huge, paddingBottom: spacing.xxxl },
  form: { gap: spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingTop: spacing.xxl },
  link: { ...typography.label, color: colors.primary },
  serverError: { ...typography.bodySecondary, color: colors.danger },
});
