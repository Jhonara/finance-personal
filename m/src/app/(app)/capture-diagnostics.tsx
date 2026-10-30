import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AppAlert } from '@/feedback/app-alert';
import { useAuth } from '@/auth/auth-provider';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { getCurrentUser } from '@/features/profile/profile-api';
import { openForm } from '@/features/forms/form-session';
import {
  captureQaEnabled,
  getCaptureDiagnostics,
  type CaptureDiagnosticSnapshot,
} from '@/features/capture/capture-diagnostics';
import { captureScenarios, type CaptureScenario } from '@/features/capture/capture-scenarios';
import { captureRejectionReason } from '@/features/capture/interpret-text';
import { prepareCaptureText } from '@/features/capture/shared-text-intake';
import { createDetectedDraft } from '@/features/capture/detected-intake';
import {
  notificationBridge,
  type NativeCaptureDiagnostic,
  type NotificationStatus,
} from '@/features/capture/notification-bridge';
import { Button, Card, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { EmptyState } from '@/ui/states';
import { spacing, typography } from '@/theme';

const reasonLabel: Record<string, string> = {
  SAVED_PENDING: 'Pendiente recibido del servidor',
  DUPLICATE_PENDING: 'Pendiente existente',
  EMPTY_TEXT: 'Sin texto legible',
  AUTH_MESSAGE: 'Mensaje de seguridad excluido',
  NO_MOVEMENT: 'No parece un movimiento',
  USER_DISCARDED: 'Descartado por la persona',
  OFFLINE_OR_TIMEOUT: 'Sin respuesta del servidor',
  SESSION_EXPIRED: 'Sesión vencida',
  SERVER_REJECTED: 'Servidor rechazó la captura',
  SESSION_CHANGED: 'La cuenta cambió durante la captura',
  NOTICE_BLOCKED: 'Android no permite mostrar avisos',
  DUPLICATE_EVENT: 'Mismo aviso recibido otra vez',
  QUEUE_FULL: 'Cola local llena',
  QUEUED_ENCRYPTED: 'Aviso retenido en el teléfono',
  LISTENER_ERROR: 'Android no pudo leer el aviso',
};
const outcomeLabel: Record<string, string> = {
  ACCEPTED: 'Aceptada',
  IGNORED: 'Ignorada',
  DISCARDED: 'Descartada',
  FAILED: 'Falló',
};
const showDate = (value?: string | number) =>
  value ? new Date(value).toLocaleString('es-CO') : 'Aún no hay una sincronización verificada';

export default function CaptureDiagnosticsScreen() {
  const { state, qaServerUrl } = useAuth();
  const user = useCurrentUser();
  const ownerId = user.data?.id ? String(user.data.id) : '';
  const [verifiedOwner, setVerifiedOwner] = useState('');
  const [server, setServer] = useState('Sin comprobar');
  const [displayPermission, setDisplayPermission] = useState('Sin comprobar');
  const [listener, setListener] = useState<NotificationStatus>();
  const [nativeEvents, setNativeEvents] = useState<NativeCaptureDiagnostic[]>([]);
  const [snapshot, setSnapshot] = useState<CaptureDiagnosticSnapshot>({ events: [] });
  const [selected, setSelected] = useState<CaptureScenario>();
  const [busy, setBusy] = useState(false);
  const sessionGeneration = useRef(0);

  useEffect(() => {
    sessionGeneration.current += 1;
    setVerifiedOwner('');
    setSnapshot({ events: [] });
    setNativeEvents([]);
    setSelected(undefined);
    setServer('Sin comprobar');
    setBusy(false);
  }, [state]);

  const refresh = useCallback(async () => {
    if (!captureQaEnabled || state.status !== 'authenticated' || !ownerId) return;
    const generation = sessionGeneration.current;
    setBusy(true);
    const [connection, permissions] = await Promise.allSettled([
      getCurrentUser(),
      Notifications.getPermissionsAsync(),
    ]);
    const matches = connection.status === 'fulfilled' && String(connection.value.id) === ownerId;
    if (generation !== sessionGeneration.current) return;
    setServer(matches ? 'Conectado con tu sesión actual' : 'No se pudo comprobar la conexión o la sesión');
    setDisplayPermission(
      permissions.status === 'fulfilled'
        ? permissions.value.granted
          ? 'Permitido'
          : 'Denegado o pendiente'
        : 'No disponible',
    );
    if (matches) {
      setVerifiedOwner(ownerId);
      const nextSnapshot = await getCaptureDiagnostics(ownerId);
      if (generation !== sessionGeneration.current) return;
      setSnapshot(nextSnapshot);
      try {
        setListener(notificationBridge.available ? notificationBridge.status() : undefined);
        setNativeEvents(notificationBridge.available ? notificationBridge.diagnostics(ownerId) : []);
      } catch {
        setListener(undefined);
        setNativeEvents([]);
      }
    } else if (verifiedOwner !== ownerId || connection.status === 'fulfilled') {
      setVerifiedOwner('');
      setSnapshot({ events: [] });
      setListener(undefined);
      setNativeEvents([]);
    }
    setBusy(false);
  }, [ownerId, state.status, verifiedOwner]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!captureQaEnabled)
    return (
      <Screen>
        <EmptyState title="No disponible" description="El diagnóstico solo se incluye en desarrollo y QA." />
        <Button onPress={() => router.replace('/(app)/more')}>Volver</Button>
      </Screen>
    );

  const suggestion = selected ? prepareCaptureText(selected.text, 'SHARED_TEXT') : null;
  const rejection = selected && !suggestion ? captureRejectionReason(selected.text) : null;
  const saveScenario = (scenario: CaptureScenario) => {
    const intake = prepareCaptureText(scenario.text, 'SHARED_TEXT');
    if (!intake || intake.suggestion.kind !== 'EXPENSE' || busy || verifiedOwner !== ownerId) return;
    AppAlert.alert(
      '¿Crear un pendiente ficticio?',
      'Se guardará solo en Movimientos detectados. No cambia saldos ni registra un gasto. Descártalo cuando termines la prueba.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Crear pendiente',
          onPress: () => {
            setBusy(true);
            void createDetectedDraft(intake, `qa-${scenario.eventId}`, ownerId)
              .then((draft) => {
                if (draft.id) openForm('/(app)/purchase-review', { id: String(draft.id) });
              })
              .catch(() => {
                AppAlert.alert(
                  'No se guardó',
                  'El escenario sigue disponible. Comprueba la conexión y reintenta.',
                );
              })
              .finally(() => {
                setBusy(false);
                void refresh();
              });
          },
        },
      ],
    );
  };

  return (
    <Screen entry scroll style={{ gap: spacing.lg }}>
      <ScreenHeader
        title="Diagnóstico de captura"
        subtitle="Solo desarrollo y QA · no muestra datos bancarios"
        back
        onBack={() => router.back()}
      />
      {state.status !== 'authenticated' || !ownerId ? (
        <EmptyState
          title="Inicia sesión"
          description="El diagnóstico se muestra solo para la cuenta autenticada."
        />
      ) : verifiedOwner !== ownerId ? (
        <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={typography.cardTitle}>Comprobando tu sesión</Text>
          <Text style={typography.bodySecondary}>{server}</Text>
          <Button loading={busy} onPress={() => void refresh()}>
            Reintentar comprobación
          </Button>
        </Card>
      ) : (
        <>
          <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text style={typography.cardTitle}>Estado actual</Text>
            <Text style={typography.bodySecondary}>Servidor: {server}</Text>
            <Text style={typography.bodySecondary}>Dirección local: {qaServerUrl}</Text>
            <Text style={typography.caption}>
              Para cambiarla, cierra sesión y usa «Cambiar IP del computador» en la entrada.
            </Text>
            <Text style={typography.bodySecondary}>Permiso para mostrar avisos: {displayPermission}</Text>
            <Text style={typography.bodySecondary}>
              Lectura de avisos bancarios: {listener?.accessGranted ? 'Autorizada' : 'Sin autorización'}
            </Text>
            <Text style={typography.bodySecondary}>
              Captura bancaria: {listener?.enabled ? 'Activada' : 'Desactivada'} ·{' '}
              {listener?.pendingCount ?? 0} en cola local
            </Text>
            <Text style={typography.bodySecondary}>
              Última sincronización: {showDate(snapshot.lastSyncAt)}
            </Text>
            <Button variant="secondary" loading={busy} onPress={() => void refresh()}>
              Actualizar diagnóstico
            </Button>
            <Button variant="ghost" onPress={() => router.push('/(app)/capture-notifications')}>
              Revisar avisos bancarios
            </Button>
          </Card>
          <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text style={typography.cardTitle}>Decisiones recientes</Text>
            <Text style={typography.caption}>
              Solo fecha, fuente y motivo. No se guardan textos, importes, tokens ni números de tarjeta.
            </Text>
            {!snapshot.events.length && !nativeEvents.length && (
              <Text style={typography.bodySecondary}>Aún no hay decisiones registradas en esta cuenta.</Text>
            )}
            {[
              ...snapshot.events.map((item) => ({ ...item, atMs: Date.parse(item.at) })),
              ...nativeEvents.map((item) => ({ ...item, source: 'NOTIFICATION', atMs: item.at })),
            ]
              .sort((a, b) => b.atMs - a.atMs)
              .slice(0, 20)
              .map((item, index) => (
                <View key={`${item.atMs}-${index}`} style={{ gap: spacing.xs }}>
                  <Text style={typography.label}>
                    {outcomeLabel[item.outcome] ?? item.outcome} · {item.source}
                  </Text>
                  <Text style={typography.caption}>
                    {reasonLabel[item.reason] ?? 'Motivo no disponible'} · {showDate(item.atMs)}
                  </Text>
                </View>
              ))}
          </Card>
          <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text style={typography.cardTitle}>Simulador de compras</Text>
            <Text style={typography.bodySecondary}>
              Elige un ejemplo. Primero se analiza solo en el teléfono; nada se envía automáticamente.
            </Text>
            {captureScenarios.map((scenario) => (
              <Button
                key={scenario.id}
                variant={selected?.id === scenario.id ? 'primary' : 'secondary'}
                onPress={() => setSelected(scenario)}
              >
                {scenario.title}
              </Button>
            ))}
            {selected && (
              <View style={{ gap: spacing.sm }}>
                <Text style={typography.label}>{selected.title}</Text>
                <Text style={typography.bodySecondary}>{selected.text}</Text>
                <Text style={typography.bodySecondary}>
                  Resultado:{' '}
                  {suggestion
                    ? `${suggestion.suggestion.kind} · ${suggestion.suggestion.confidence}`
                    : (reasonLabel[rejection ?? ''] ?? 'Ignorado')}
                </Text>
                {suggestion?.suggestion.warnings.map((warning) => (
                  <Text key={warning} style={typography.caption}>
                    • {warning}
                  </Text>
                ))}
                {suggestion?.suggestion.kind === 'EXPENSE' && (
                  <Button loading={busy} onPress={() => saveScenario(selected)}>
                    Crear pendiente de prueba
                  </Button>
                )}
              </View>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
