import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { toApiError } from '@/api/errors';
import { getCurrentUser } from '@/features/profile/profile-api';
import {
  notificationBridge,
  type NotificationStatus,
  type PendingNotification,
} from '@/features/capture/notification-bridge';
import { prepareCaptureText, type AcceptedSharedText } from '@/features/capture/shared-text-intake';
import { usePrivacy } from '@/privacy/privacy-provider';
import { PurchaseEditor } from './purchase-review';
import { detectedRequestKey } from '@/features/capture/detected-intake';
import { useDetectedDrafts } from '@/features/capture/use-detected-drafts';
import { Button, Card, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { EmptyState, SkeletonRow } from '@/ui/states';
import { spacing, typography } from '@/theme';

type Review = { notice: PendingNotification; intake: AcceptedSharedText };

export default function CaptureNotificationsScreen() {
  const { state, logout } = useAuth();
  const { hidden } = usePrivacy();
  const [owner, setOwner] = useState<string>();
  const [verifiedSession, setVerifiedSession] = useState<typeof state>();
  const [status, setStatus] = useState<NotificationStatus>();
  const [pending, setPending] = useState<PendingNotification[]>([]);
  const [selected, setSelected] = useState<Review>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const detected = useDetectedDrafts(
    pending.flatMap((notice) => {
      const intake = prepareCaptureText(notice.text, 'NOTIFICATION');
      return intake ? [{ intake, occurrence: notice.id.slice(0, 32) }] : [];
    }),
    state,
  );

  useEffect(() => {
    if (!owner || !Object.keys(detected.saved).length) return;
    let acknowledged = false;
    for (const notice of pending) {
      const intake = prepareCaptureText(notice.text, 'NOTIFICATION');
      if (!intake || !detected.saved[detectedRequestKey(intake, notice.id.slice(0, 32))]) continue;
      notificationBridge.acknowledge(owner, notice.id);
      acknowledged = true;
    }
    if (acknowledged) setPending(notificationBridge.pending(owner));
  }, [owner, pending, detected.saved]);

  const refresh = useCallback(async () => {
    if (state.status !== 'authenticated') return;
    setBusy(true);
    setError('');
    try {
      const user = await getCurrentUser();
      if (!user.id) throw new Error('No pudimos comprobar el usuario.');
      const currentOwner = String(user.id);
      notificationBridge.setOwner(currentOwner);
      setSelected(undefined);
      setOwner(currentOwner);
      setVerifiedSession(state);
      setStatus(notificationBridge.status());
      setPending(notificationBridge.pending(currentOwner));
    } catch (failure) {
      setSelected(undefined);
      setOwner(undefined);
      setVerifiedSession(undefined);
      setPending([]);
      if (toApiError(failure).status === 401) await logout();
      else setError('No pudimos comprobar tu sesión o leer los avisos. Revisa la conexión y reintenta.');
    } finally {
      setBusy(false);
    }
  }, [state, logout]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const change = (action: () => void) => {
    try {
      action();
      setStatus(notificationBridge.status());
      if (owner) setPending(notificationBridge.pending(owner));
      setError('');
    } catch {
      setError('Android no permitió el cambio. Comprueba el permiso y reintenta.');
    }
  };
  const discard = (id: string) => {
    if (!owner) return;
    change(() => notificationBridge.discard(owner, id));
  };
  const acknowledge = (id: string) => {
    if (!owner) return;
    change(() => notificationBridge.acknowledge(owner, id));
  };
  if (state.status !== 'authenticated')
    return (
      <Screen>
        <SkeletonRow />
      </Screen>
    );
  if (verifiedSession !== state)
    return (
      <Screen style={{ gap: spacing.lg }}>
        {error ? (
          <>
            <EmptyState title="No pudimos comprobar tu sesión" description={error} />
            <Button onPress={() => void refresh()}>Reintentar</Button>
          </>
        ) : (
          <SkeletonRow />
        )}
      </Screen>
    );
  const selectedDraft = selected
    ? detected.saved[detectedRequestKey(selected.intake, selected.notice.id.slice(0, 32))]
    : undefined;
  if (selected && selectedDraft)
    return (
      <PurchaseEditor
        initial={selectedDraft}
        onBack={() => setSelected(undefined)}
        onSavedImport={() => acknowledge(selected.notice.id)}
      />
    );

  return (
    <Screen entry scroll style={{ gap: spacing.lg }}>
      <ScreenHeader
        title="Avisos bancarios"
        subtitle="Solo aplicaciones que elijas. Los avisos no cambian tu saldo."
        back
        onBack={() => router.back()}
      />
      {!notificationBridge.available ? (
        <EmptyState
          title="Función no incluida"
          description="Instala la nueva compilación Android para usarla."
        />
      ) : !owner && busy ? (
        <SkeletonRow />
      ) : error && !owner ? (
        <EmptyState title="No pudimos cargar tus avisos" description={error} />
      ) : (
        <>
          {error && <Text style={typography.bodySecondary}>{error}</Text>}
          <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text style={typography.cardTitle}>Activación voluntaria</Text>
            <Text style={typography.bodySecondary}>
              Primero autoriza el acceso en Android. Luego activa la detección aquí y elige las aplicaciones
              que quieres analizar.
            </Text>
            {!status?.accessGranted && (
              <Button onPress={() => change(() => notificationBridge.openSettings())}>
                Autorizar en Android
              </Button>
            )}
            <Button
              variant="secondary"
              disabled={!owner || !status?.accessGranted}
              onPress={() => change(() => notificationBridge.setEnabled(!status?.enabled))}
            >
              {status?.enabled ? 'Desactivar y borrar avisos pendientes' : 'Activar detección'}
            </Button>
            <Button variant="ghost" loading={busy} onPress={() => void refresh()}>
              Actualizar permiso y avisos
            </Button>
          </Card>
          {status?.enabled && (
            <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text style={typography.cardTitle}>Aplicaciones permitidas</Text>
              <Text style={typography.bodySecondary}>
                Aparecerán las apps que envíen una notificación después de activar esta función. Solo se lee
                el contenido de las que marques.
              </Text>
              {!status.observed.length && (
                <Text style={typography.caption}>Aún no hay aplicaciones detectadas.</Text>
              )}
              {status.observed.map((packageName) => (
                <Button
                  key={packageName}
                  variant="secondary"
                  onPress={() =>
                    change(() =>
                      notificationBridge.setApps(
                        status.allowed.includes(packageName)
                          ? status.allowed.filter((item) => item !== packageName)
                          : [...status.allowed, packageName],
                      ),
                    )
                  }
                >
                  {status.allowed.includes(packageName) ? '✓ Permitida · ' : 'Permitir · '}
                  {packageName}
                </Button>
              ))}
            </Card>
          )}
          <Text style={typography.cardTitle}>Pendientes de revisión · {pending.length}</Text>
          {pending.map((notice) => {
            const intake = prepareCaptureText(notice.text, 'NOTIFICATION');
            return (
              <Card key={notice.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
                <Text style={typography.body}>{intake?.suggestion.description ?? 'Posible movimiento'}</Text>
                <Text style={typography.bodySecondary}>
                  {intake?.suggestion.amount && intake.suggestion.currency
                    ? hidden
                      ? 'Importe oculto'
                      : `${intake.suggestion.amount} ${intake.suggestion.currency}`
                    : 'Importe por comprobar'}
                </Text>
                <Text style={typography.caption}>{notice.packageName}</Text>
                {intake && (
                  <>
                    <Button
                      disabled={!detected.saved[detectedRequestKey(intake, notice.id.slice(0, 32))]}
                      onPress={() => setSelected({ notice, intake })}
                    >
                      {detected.saved[detectedRequestKey(intake, notice.id.slice(0, 32))]
                        ? 'Revisar y corregir'
                        : 'Guardando pendiente…'}
                    </Button>
                    {detected.errors[detectedRequestKey(intake, notice.id.slice(0, 32))] && (
                      <Button
                        variant="secondary"
                        onPress={() => void detected.retry({ intake, occurrence: notice.id.slice(0, 32) })}
                      >
                        Reintentar guardado
                      </Button>
                    )}
                  </>
                )}
                <Button variant="ghost" onPress={() => discard(notice.id)}>
                  Descartar aviso
                </Button>
              </Card>
            );
          })}
          {!pending.length && (
            <Text style={typography.bodySecondary}>
              Todavía no hay movimientos detectados. Si elegiste una app, aparecerán aquí los próximos avisos
              de operaciones.
            </Text>
          )}
          <Text style={typography.caption}>
            No se leen SMS ni se guarda el historial general de notificaciones. Los campos detectados quedan
            pendientes; solo tu confirmación modifica saldos.
          </Text>
        </>
      )}
    </Screen>
  );
}
