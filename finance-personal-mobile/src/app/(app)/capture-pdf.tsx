import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Text } from 'react-native';
import { captureOcr } from '@/features/capture/ocr';
import { prepareCaptureText, type AcceptedSharedText } from '@/features/capture/shared-text-intake';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { PurchaseEditor } from './purchase-review';
import { useAuth } from '@/auth/auth-provider';
import { detectedRequestKey } from '@/features/capture/detected-intake';
import { useDetectedDrafts } from '@/features/capture/use-detected-drafts';
import { ScreenHeader } from '@/ui/headers';
import { Button, Card, Screen } from '@/ui/primitives';
import { EmptyState } from '@/ui/states';
import { spacing, typography } from '@/theme';

type Candidate = { page: number; intake: AcceptedSharedText };
const MAX_BYTES = 10 * 1024 * 1024;

function deletePickerCopy(uri?: string) {
  if (!uri || !uri.startsWith(Paths.cache.uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The document provider or OS may already have cleaned the temporary copy.
  }
}

export default function CapturePdfScreen() {
  const { state } = useAuth();
  const { hidden } = usePrivacy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [selected, setSelected] = useState<Candidate>();
  const currentUri = useRef<string | undefined>(undefined);
  const running = useRef(false);
  const detected = useDetectedDrafts(
    candidates.map(({ page, intake }) => ({ intake, occurrence: String(page) })),
    state,
  );

  useEffect(() => () => deletePickerCopy(currentUri.current), []);

  const pick = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      if (!captureOcr.available) throw new Error('Esta compilación aún no incluye la lectura local de PDF.');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) throw new Error('No pudimos abrir el documento.');
      if (asset.size != null && asset.size > MAX_BYTES) {
        deletePickerCopy(asset.uri);
        throw new Error('El PDF debe pesar menos de 10 MB.');
      }
      deletePickerCopy(currentUri.current);
      currentUri.current = asset.uri;
      const reading = await captureOcr.recognizePdf(asset.uri);
      const next = reading.pages.flatMap(({ page, text }) => {
        const intake = prepareCaptureText(text, 'PDF');
        return intake ? [{ page, intake }] : [];
      });
      setCandidates(next);
      setPageCount(reading.pageCount);
      setSelected(undefined);
      if (!next.length)
        setError(
          'No encontramos movimientos legibles. El documento puede estar protegido, borroso o no contener un comprobante.',
        );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No pudimos leer el PDF.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  if (selected && detected.saved[detectedRequestKey(selected.intake, String(selected.page))])
    return (
      <PurchaseEditor
        key={`${selected.page}-${selected.intake.identity}`}
        initial={detected.saved[detectedRequestKey(selected.intake, String(selected.page))]}
        onBack={() => setSelected(undefined)}
        onSavedImport={() => {
          // Other pages remain available until the user explicitly leaves this screen.
          setCandidates((previous) => previous.filter((item) => item.page !== selected.page));
        }}
      />
    );

  return (
    <Screen entry scroll style={{ gap: spacing.lg }}>
      <ScreenHeader
        title="Leer comprobante PDF"
        subtitle="El documento se lee en este teléfono. Revisa cada movimiento antes de guardarlo."
        back
        onBack={() => router.back()}
      />
      <Button loading={busy} disabled={busy} onPress={() => void pick()}>
        Seleccionar PDF
      </Button>
      {error && <EmptyState title="No pudimos interpretar el PDF" description={error} />}
      {pageCount > 0 && (
        <Text style={typography.bodySecondary}>
          {pageCount} {pageCount === 1 ? 'página revisada' : 'páginas revisadas'} · {candidates.length}{' '}
          {candidates.length === 1 ? 'posible movimiento' : 'posibles movimientos'}
        </Text>
      )}
      {candidates.map(({ page, intake }) => (
        <Card key={`${page}-${intake.identity}`} style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={typography.cardTitle}>Página {page}</Text>
          <Text style={typography.bodySecondary}>
            {hidden
              ? 'Importe oculto'
              : intake.suggestion.amount && intake.suggestion.currency
                ? formatPrivateMoney(intake.suggestion.amount, intake.suggestion.currency, false)
                : 'Importe por comprobar'}
          </Text>
          {intake.suggestion.warnings.map((warning) => (
            <Text key={warning} style={typography.caption}>
              {warning}
            </Text>
          ))}
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
          <Button
            variant="secondary"
            disabled={!detected.saved[detectedRequestKey(intake, String(page))]}
            onPress={() => setSelected({ page, intake })}
          >
            {detected.saved[detectedRequestKey(intake, String(page))]
              ? 'Revisar y corregir'
              : 'Guardando pendiente…'}
          </Button>
        </Card>
      ))}
      <Text style={typography.caption}>
        Se admiten hasta 8 páginas y 10 MB. Se guardan solo los datos detectados como pendientes; el archivo
        no se envía y tu saldo no cambia.
      </Text>
    </Screen>
  );
}
