import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Text } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { getCurrentUser } from '@/features/profile/profile-api';
import { toApiError } from '@/api/errors';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { captureOcr } from '@/features/capture/ocr';
import type { DetectedMovement } from '@/features/capture/interpret-text';
import {
  prepareCaptureText,
  prepareSharedText,
  type AcceptedSharedText,
} from '@/features/capture/shared-text-intake';
import { PurchaseEditor } from './(app)/purchase-review';
import { detectedRequestKey } from '@/features/capture/detected-intake';
import { useDetectedDrafts } from '@/features/capture/use-detected-drafts';
import LoginScreen from './(auth)/login';
import { Button, Card, Screen } from '@/ui/primitives';
import { EmptyState, SkeletonRow } from '@/ui/states';
import { ScreenHeader } from '@/ui/headers';
import { spacing, typography } from '@/theme';

const kindLabel: Record<DetectedMovement['kind'], string> = {
  EXPENSE: 'Compra o gasto',
  INCOME: 'Ingreso',
  TRANSFER: 'Transferencia',
  WITHDRAWAL: 'Retiro',
  CREDIT_PAYMENT: 'Pago de crédito',
  REFUND: 'Devolución',
  REVERSAL: 'Reverso',
  UNKNOWN: 'Por identificar',
};

function sharedFileUri(copy: string | null | undefined, original: string | undefined) {
  if (!copy) return original;
  if (!copy.startsWith('file:')) return copy;
  try {
    const file = new File(copy);
    if (file.exists && file.size > 0) return copy;
  } catch {
    // A provider may fail while Expo copies the shared file into its cache.
  }
  return original;
}

function deleteCachedShare(copy?: string | null) {
  if (!copy?.startsWith('file:')) return;
  try {
    const file = new File(copy);
    const path = file.uri.replace(/^file:\/+/, '');
    const cache = Paths.cache.uri.replace(/^file:\/+/, '').replace(/\/$/, '');
    if (path.startsWith(`${cache}/`) && file.exists) file.delete();
  } catch {
    // Android may already have removed this temporary copy.
  }
}

/** Shared text is processed only after the session has been checked with the server. */
export default function SharedCaptureScreen() {
  const { state, logout } = useAuth();
  const [verified, setVerified] = useState<{ session: typeof state; ownerId: number }>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (state.status !== 'authenticated') return;
    let active = true;
    void getCurrentUser()
      .then((user) => {
        if (!active) return;
        if (!user.id) throw new Error('No se pudo comprobar el usuario.');
        setVerified({ session: state, ownerId: user.id });
        setError(false);
      })
      .catch((failure) => {
        if (!active) return;
        if (toApiError(failure).status === 401) void logout().catch(() => setError(true));
        else setError(true);
      });
    return () => {
      active = false;
    };
  }, [state, logout, attempt]);

  if (state.status !== 'authenticated') {
    // The native share payload stays in Expo Sharing while the user signs in.
    return <LoginScreen />;
  }
  if (error)
    return (
      <Screen style={{ gap: spacing.md }}>
        <EmptyState
          title="No pudimos comprobar tu sesión"
          description="Revisa la conexión. El mensaje compartido sigue pendiente en este teléfono."
        />
        <Button
          onPress={() => {
            setError(false);
            setAttempt((value) => value + 1);
          }}
        >
          Reintentar
        </Button>
      </Screen>
    );
  if (verified?.session !== state)
    return (
      <Screen>
        <SkeletonRow />
      </Screen>
    );
  return <VerifiedShare key={`${verified.ownerId}`} />;
}

function VerifiedShare() {
  const { state } = useAuth();
  const { hidden } = usePrivacy();
  const { sharedPayloads, resolvedSharedPayloads, clearSharedPayloads } = useIncomingShare();
  const [accepted, setAccepted] = useState<AcceptedSharedText>();
  const [editing, setEditing] = useState(false);
  const [imageResult, setImageResult] = useState<{
    uri: string;
    intake: AcceptedSharedText | null;
    error?: string;
  }>();
  const [pdfResult, setPdfResult] = useState<{
    uri: string;
    candidates: { page: number; intake: AcceptedSharedText }[];
    error?: string;
  }>();
  const [selectedPdfPage, setSelectedPdfPage] = useState<number>();
  const copies = useRef<(string | null | undefined)[]>([]);
  useEffect(() => () => copies.current.forEach(deleteCachedShare), []);
  const rawText = sharedPayloads.find(
    (payload) => payload.shareType === 'text' && payload.mimeType === 'text/plain',
  )?.value;
  const rawImage = sharedPayloads.find(
    (payload) => payload.shareType === 'image' && payload.mimeType?.startsWith('image/'),
  );
  const resolvedImage = resolvedSharedPayloads.find(
    (payload) => payload.value === rawImage?.value && payload.contentType === 'image',
  );
  const imageUri = sharedFileUri(resolvedImage?.contentUri, rawImage?.value);
  const rawPdf = sharedPayloads.find(
    (payload) => payload.shareType === 'file' && payload.mimeType === 'application/pdf',
  );
  const resolvedPdf = resolvedSharedPayloads.find(
    (payload) => payload.value === rawPdf?.value && payload.contentMimeType === 'application/pdf',
  );
  const pdfUri = sharedFileUri(resolvedPdf?.contentUri, rawPdf?.value);
  copies.current = [resolvedImage?.contentUri, resolvedPdf?.contentUri];
  useEffect(() => {
    if (!imageUri) return;
    let active = true;
    const read = async () => {
      if (!captureOcr.available)
        throw new Error('Esta compilación aún no incluye la lectura local de imágenes.');
      if (resolvedImage?.contentSize != null && resolvedImage.contentSize > 10 * 1024 * 1024)
        throw new Error('La imagen supera el límite de 10 MB.');
      const text = await captureOcr.recognizeImage(imageUri);
      return prepareCaptureText(text, 'IMAGE');
    };
    void read()
      .then((intake) => {
        if (active) setImageResult({ uri: imageUri, intake });
      })
      .catch((failure: unknown) => {
        if (active)
          setImageResult({
            uri: imageUri,
            intake: null,
            error: failure instanceof Error ? failure.message : 'No pudimos leer esta imagen.',
          });
      });
    return () => {
      active = false;
    };
  }, [imageUri, resolvedImage?.contentSize]);
  useEffect(() => {
    if (!pdfUri) return;
    let active = true;
    const read = async () => {
      if (!captureOcr.available) throw new Error('Esta compilación aún no incluye la lectura local de PDF.');
      if (resolvedPdf?.contentSize != null && resolvedPdf.contentSize > 10 * 1024 * 1024)
        throw new Error('El PDF supera el límite de 10 MB.');
      const document = await captureOcr.recognizePdf(pdfUri);
      return document.pages.flatMap(({ page, text }) => {
        const intake = prepareCaptureText(text, 'PDF');
        return intake ? [{ page, intake }] : [];
      });
    };
    void read()
      .then((candidates) => {
        if (active) setPdfResult({ uri: pdfUri, candidates });
      })
      .catch((failure: unknown) => {
        if (active)
          setPdfResult({
            uri: pdfUri,
            candidates: [],
            error: failure instanceof Error ? failure.message : 'No pudimos leer este PDF.',
          });
      });
    return () => {
      active = false;
    };
  }, [pdfUri, resolvedPdf?.contentSize]);
  const incoming = useMemo(
    () =>
      rawText
        ? prepareSharedText(rawText)
        : imageResult && imageResult.uri === imageUri
          ? imageResult.intake
          : pdfResult && pdfResult.uri === pdfUri
            ? (pdfResult.candidates[0]?.intake ?? null)
            : null,
    [rawText, imageResult, imageUri, pdfResult, pdfUri],
  );
  const current = accepted ?? incoming;
  const detected = useDetectedDrafts(
    pdfUri
      ? (pdfResult?.candidates ?? []).map(({ page, intake }) => ({ intake, occurrence: String(page) }))
      : incoming
        ? [{ intake: incoming }]
        : [],
    state,
  );
  const currentKey = current ? detectedRequestKey(current, pdfUri ? String(selectedPdfPage ?? 1) : '') : '';
  const currentDraft = detected.saved[currentKey];
  const newer = Boolean(!pdfUri && accepted && incoming && incoming.identity !== accepted.identity);
  const discard = () => {
    copies.current.forEach(deleteCachedShare);
    clearSharedPayloads();
    setAccepted(undefined);
    setEditing(false);
    router.replace('/(app)/inbox');
  };

  if (editing && current && currentDraft)
    return (
      <PurchaseEditor
        key={current.identity}
        initial={currentDraft}
        onBack={() => {
          setEditing(false);
          setAccepted(undefined);
          setSelectedPdfPage(undefined);
        }}
        onNewIntake={
          newer
            ? () => {
                setAccepted(incoming!);
                setEditing(false);
              }
            : undefined
        }
        onSavedImport={() => {
          if (pdfUri && selectedPdfPage != null)
            setPdfResult((previous) =>
              previous
                ? {
                    ...previous,
                    candidates: previous.candidates.filter(({ page }) => page !== selectedPdfPage),
                  }
                : previous,
            );
          else if (!newer) {
            copies.current.forEach(deleteCachedShare);
            clearSharedPayloads();
          }
        }}
      />
    );

  return (
    <Screen entry scroll style={{ gap: spacing.lg }}>
      <ScreenHeader
        title="Movimiento detectado"
        subtitle="El comprobante sigue en tu teléfono hasta que decidas qué hacer."
        back
        onBack={discard}
      />
      {!rawText && !imageUri && !pdfUri ? (
        <EmptyState
          title="No hay comprobante compartido"
          description="Comparte un aviso como texto, imagen o PDF desde otra aplicación, o pégalo en Por revisar."
        />
      ) : (imageUri && imageResult?.uri !== imageUri) || (pdfUri && pdfResult?.uri !== pdfUri) ? (
        <SkeletonRow />
      ) : pdfUri && !accepted && pdfResult?.candidates.length ? (
        pdfResult.candidates.map(({ page, intake }) => (
          <Card key={`${page}-${intake.identity}`} style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text style={typography.cardTitle}>
              Página {page} · {kindLabel[intake.suggestion.kind]}
            </Text>
            <Text style={typography.bodySecondary}>
              {hidden
                ? 'Importe oculto'
                : intake.suggestion.amount && intake.suggestion.currency
                  ? formatPrivateMoney(intake.suggestion.amount, intake.suggestion.currency, false)
                  : 'Importe por comprobar'}
            </Text>
            <Button
              disabled={!detected.saved[detectedRequestKey(intake, String(page))]}
              onPress={() => {
                setAccepted(intake);
                setSelectedPdfPage(page);
                setEditing(true);
              }}
            >
              {detected.saved[detectedRequestKey(intake, String(page))]
                ? 'Revisar y corregir'
                : detected.errors[detectedRequestKey(intake, String(page))]
                  ? 'Pendiente sin guardar'
                  : 'Guardando pendiente…'}
            </Button>
            {detected.errors[detectedRequestKey(intake, String(page))] && (
              <>
                <Text style={typography.bodySecondary}>
                  {detected.errors[detectedRequestKey(intake, String(page))]}
                </Text>
                <Button
                  variant="secondary"
                  onPress={() => void detected.retry({ intake, occurrence: String(page) })}
                >
                  Reintentar guardado
                </Button>
              </>
            )}
          </Card>
        ))
      ) : !current ? (
        <EmptyState
          title="No identificamos un movimiento"
          description={
            imageResult?.error ??
            pdfResult?.error ??
            'Puede ser una clave, un aviso sin operación o un comprobante ilegible. No se guardó nada.'
          }
        />
      ) : (
        <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={typography.cardTitle}>{kindLabel[current.suggestion.kind]}</Text>
          <Text style={typography.bodySecondary}>
            {hidden
              ? 'Importe oculto'
              : current.suggestion.amount && current.suggestion.currency
                ? formatPrivateMoney(current.suggestion.amount, current.suggestion.currency, false)
                : 'Importe por comprobar'}
          </Text>
          <Text style={typography.caption}>
            Confianza de la lectura:{' '}
            {current.suggestion.confidence === 'HIGH'
              ? 'alta'
              : current.suggestion.confidence === 'MEDIUM'
                ? 'media'
                : 'baja'}
            . Es solo una sugerencia.
          </Text>
          {current.suggestion.warnings.map((warning) => (
            <Text key={warning} style={typography.bodySecondary}>
              {warning}
            </Text>
          ))}
          <Button
            disabled={!currentDraft}
            onPress={() => {
              setAccepted(current);
              setEditing(true);
            }}
          >
            {currentDraft
              ? 'Revisar y corregir'
              : detected.errors[currentKey]
                ? 'Pendiente sin guardar'
                : 'Guardando pendiente…'}
          </Button>
          {detected.errors[currentKey] && (
            <>
              <Text style={typography.bodySecondary}>{detected.errors[currentKey]}</Text>
              <Button
                variant="secondary"
                onPress={() =>
                  void detected.retry({
                    intake: current,
                    occurrence: pdfUri ? String(selectedPdfPage ?? 1) : '',
                  })
                }
              >
                Reintentar guardado
              </Button>
            </>
          )}
        </Card>
      )}
      {newer && (
        <Button
          variant="secondary"
          onPress={() => {
            setAccepted(incoming!);
            setEditing(false);
          }}
        >
          Revisar nuevo comprobante compartido
        </Button>
      )}
      <Button variant="ghost" onPress={discard}>
        {currentDraft || Object.keys(detected.saved).length ? 'Cerrar captura' : 'Descartar comprobante'}
      </Button>
    </Screen>
  );
}
