import { useAppTheme } from '@/theme/theme-provider';
import { themedStyleSheet } from '@/theme/themed-styles';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import { useAuth } from '@/auth/auth-provider';
import { qaApiServerEnabled } from '@/config/qa-api-server';
import { loginSchema, type LoginFormValues } from '@/auth/auth-schemas';
import { applyApiFieldErrors, friendlyAuthError } from '@/auth/form-errors';
import { colors, spacing, typography } from '@/theme';
import { Button, Card, Input, Screen } from '@/ui/primitives';
import { AuthIntro } from '@/ui/auth-intro';

export default function LoginScreen() {
  useAppTheme();
  const { login, qaServerUrl, setQaServer } = useAuth();
  const [showServer, setShowServer] = useState(false);
  const [serverInput, setServerInput] = useState(qaServerUrl);
  const [serverError, setServerError] = useState('');
  const [savingServer, setSavingServer] = useState(false);
  useEffect(() => setServerInput(qaServerUrl), [qaServerUrl]);
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
      <AuthIntro title="Bienvenido de nuevo" description="Entra para ver tu dinero y seguir tus planes." />
      <Card style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value, onBlur, ref } }) => (
            <Input
              label="Correo electrónico"
              inputRef={ref}
              disabled={isSubmitting}
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
          render={({ field: { onChange, value, onBlur, ref } }) => (
            <Input
              label="Contraseña"
              inputRef={ref}
              disabled={isSubmitting}
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
      </Card>
      <View style={styles.footer}>
        <Text style={typography.bodySecondary}>¿No tienes cuenta?</Text>
        <Link href="/(auth)/register" replace style={styles.link}>
          Crear cuenta
        </Link>
      </View>
      {qaApiServerEnabled && (
        <View style={styles.qaServer}>
          <Text style={typography.caption}>Servidor local de QA: {qaServerUrl}</Text>
          <Button variant="ghost" onPress={() => setShowServer((current) => !current)}>
            {showServer ? 'Cerrar ajuste de servidor' : 'Cambiar IP del computador'}
          </Button>
          {showServer && (
            <>
              <Input
                label="IP privada del computador"
                placeholder="192.168.1.55"
                value={serverInput}
                onChangeText={setServerInput}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                error={serverError || undefined}
              />
              <Text style={typography.caption}>
                El celular y el computador deben estar en la misma red. Puerto 8080.
              </Text>
              <Button
                variant="secondary"
                loading={savingServer}
                disabled={savingServer}
                onPress={() => {
                  setSavingServer(true);
                  setServerError('');
                  void setQaServer(serverInput)
                    .then(() => setShowServer(false))
                    .catch((error: unknown) =>
                      setServerError(
                        error instanceof Error ? error.message : 'No se pudo guardar la dirección.',
                      ),
                    )
                    .finally(() => setSavingServer(false));
                }}
              >
                Guardar servidor local
              </Button>
            </>
          )}
        </View>
      )}
      <Link href="/(auth)/explore" style={styles.explore}>
        Explorar la app sin cuenta →
      </Link>
    </Screen>
  );
}

const styles = themedStyleSheet(() => ({
  hero: { gap: spacing.sm, paddingTop: spacing.huge, paddingBottom: spacing.xxxl },
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
  explore: { ...typography.label, color: colors.success, textAlign: 'center', padding: spacing.md },
  serverError: { ...typography.bodySecondary, color: colors.danger },
  qaServer: { gap: spacing.sm, paddingTop: spacing.lg },
}));
