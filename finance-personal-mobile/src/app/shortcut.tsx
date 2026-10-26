import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/auth-provider';
import { parseShortcutIntake } from '@/features/inbox/shortcut-intake';
import { PurchaseEditor } from './(app)/purchase-review';
import { Button, Screen } from '@/ui/primitives';
import { EmptyState, SkeletonRow } from '@/ui/states';

/** A public landing route checks the session before mounting any financial queries. */
export default function ShortcutScreen() {
  const { state } = useAuth();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  if (state.status === 'bootstrapping')
    return (
      <Screen>
        <SkeletonRow />
      </Screen>
    );
  if (state.status !== 'authenticated')
    return (
      <Screen>
        <EmptyState
          title="Inicia sesión para revisar la compra"
          description="Después de entrar, vuelve a ejecutar el atajo. No se ha guardado ni registrado nada."
        />
        <Button onPress={() => router.replace('/(auth)/login')}>Iniciar sesión</Button>
      </Screen>
    );
  return <AuthenticatedShortcut params={params} />;
}

function AuthenticatedShortcut({ params }: { params: Record<string, string | string[]> }) {
  const incoming = parseShortcutIntake(params);
  const [accepted, setAccepted] = useState(incoming);
  // A later link never silently replaces the form currently being edited.
  const different = JSON.stringify(incoming) !== JSON.stringify(accepted);
  if (!accepted.ok)
    return (
      <Screen>
        <EmptyState title="No pudimos abrir esta compra" description={accepted.message} />
        {different && <Button onPress={() => setAccepted(incoming)}>Revisar el nuevo enlace</Button>}
        <Button onPress={() => router.replace('/(app)/shortcuts')}>Atajos y tarjetas</Button>
      </Screen>
    );
  return (
    <PurchaseEditor
      key={accepted.intake.identity}
      imported={accepted.intake}
      onNewIntake={different ? () => setAccepted(incoming) : undefined}
    />
  );
}
