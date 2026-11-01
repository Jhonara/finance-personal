import { useRef } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { updateCurrentUser, type CurrentUser } from '@/features/profile/profile-api';
import { currentUserKeys } from '@/features/profile/profile-keys';
import { profileSchema } from '@/features/profile/profile-schema';
import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useUnsavedForm } from '@/features/forms/use-unsaved-form';
import { applyApiFieldErrors } from '@/auth/form-errors';
import { useFeedback } from '@/feedback/feedback-provider';
import { Screen, Input, Button } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { ErrorState, SkeletonRow } from '@/ui/states';
import { typography } from '@/theme';

function ProfileEditor({ user }: { user: CurrentUser }) {
  const client = useQueryClient(),
    feedback = useFeedback();
  const active = useFormSessionActive();
  const lock = useRef(false);
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      displayName: user.displayName ?? '',
    },
  });
  const mutation = useMutation({ mutationFn: updateCurrentUser, retry: false });
  const guard = useUnsavedForm({ dirty: form.formState.isDirty, busy: mutation.isPending });
  const submit = form.handleSubmit(async (values) => {
    if (lock.current) return;
    lock.current = true;
    try {
      const saved = await mutation.mutateAsync(values);
      if (
        !active() ||
        saved.id !== user.id ||
        client.getQueryData<CurrentUser>(currentUserKeys.current())?.id !== user.id
      )
        return;
      client.setQueryData(currentUserKeys.current(), saved);
      form.reset(values);
      feedback.show('Tu información quedó actualizada.', 'success');
      router.back();
    } catch (error) {
      if (active()) {
        applyApiFieldErrors(error, form.setError);
        form.setError('root', {
          message: 'No pudimos confirmar el cambio. Conservamos tus datos para que puedas reintentarlo.',
        });
      }
    } finally {
      lock.current = false;
    }
  });
  return (
    <Screen scroll keyboard>
      <ScreenHeader
        title="Mi información"
        subtitle="Elige cómo quieres que te llamemos."
        back
        onBack={() => guard.request(() => router.back())}
      />
      {!user.firstName ? (
        <Text style={typography.bodySecondary}>
          Tu nombre registrado es «{user.name}». Lo conservamos tal como está; puedes indicar sus partes tú
          mismo o cambiar solo el nombre mostrado.
        </Text>
      ) : null}
      {(
        [
          ['firstName', 'Nombre', 'Tus nombres, sin apellidos'],
          ['lastName', 'Apellidos · opcional', 'Tus apellidos completos'],
          ['displayName', 'Nombre mostrado · opcional', 'Cómo prefieres que te llamemos'],
        ] as const
      ).map(([name, label, placeholder]) => (
        <Controller
          key={name}
          control={form.control}
          name={name}
          render={({ field }) => (
            <Input
              label={label}
              placeholder={placeholder}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              maxLength={name === 'displayName' ? 50 : 100}
              disabled={mutation.isPending}
              error={form.formState.errors[name]?.message}
              autoCapitalize="words"
              helperText={
                name === 'displayName'
                  ? 'Se usa en el saludo de Inicio. Si lo dejas vacío, usamos tu nombre explícito.'
                  : undefined
              }
            />
          )}
        />
      ))}
      <Input
        label="Correo electrónico"
        value={user.email ?? ''}
        disabled
        helperText="Es el correo de acceso a tu cuenta."
      />
      {form.formState.errors.root?.message ? (
        <Text accessibilityRole="alert" style={typography.bodySecondary}>
          {form.formState.errors.root.message}
        </Text>
      ) : null}
      <Button loading={mutation.isPending} disabled={mutation.isPending} onPress={() => void submit()}>
        Guardar mi información
      </Button>
    </Screen>
  );
}
function ProfileForm() {
  const profile = useCurrentUser();
  if (!profile.data)
    return (
      <Screen>
        <ScreenHeader title="Mi información" back />
        {profile.isPending ? <SkeletonRow /> : <ErrorState onRetry={() => void profile.refetch()} />}
      </Screen>
    );
  return <ProfileEditor key={profile.data.id} user={profile.data} />;
}
export default withFormSession(ProfileForm);
