import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { Image, Text } from 'react-native';
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

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;

function deleteTemporaryImage(uri?: string) {
  if (!uri || !uri.startsWith(Paths.cache.uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The operating system may already have removed the temporary picker copy.
  }
}

export default function CaptureImageScreen() {
  const { state } = useAuth();
  const { hidden } = usePrivacy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState<AcceptedSharedText>();
  const [editing, setEditing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string>();
  const currentUri = useRef<string | undefined>(undefined);
  const running = useRef(false);
  const detected = useDetectedDrafts(accepted ? [{ intake: accepted }] : [], state);
  const draftKey = accepted ? detectedRequestKey(accepted) : '';
  const savedDraft = detected.saved[draftKey];

  useEffect(() => () => deleteTemporaryImage(currentUri.current), []);

  const handleResult = async (
    result: ImagePicker.ImagePickerResult | ImagePicker.ImagePickerErrorResult | null,
  ) => {
    if (!result || !('canceled' in result) || result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri || asset.type !== 'image') {
      setError('Elige una imagen del comprobante.');
      return;
    }
    if (
      (asset.fileSize != null && asset.fileSize > MAX_BYTES) ||
      (asset.width > 0 && asset.height > 0 && asset.width * asset.height > MAX_PIXELS)
    ) {
      deleteTemporaryImage(asset.uri);
      setError('La imagen debe pesar menos de 10 MB y no ser demasiado grande.');
      return;
    }
    deleteTemporaryImage(currentUri.current);
    currentUri.current = asset.uri;
    setPreviewUri(asset.uri);
    const text = await captureOcr.recognizeImage(asset.uri);
    const next = prepareCaptureText(text, 'IMAGE');
    if (!next) {
      setAccepted(undefined);
      setError(
        'No encontramos un movimiento legible. Prueba con otra foto más nítida o pega el texto del aviso.',
      );
      return;
    }
    setAccepted(next);
    setEditing(false);
  };

  const pick = async (camera: boolean) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      if (!captureOcr.available)
        throw new Error('Esta compilación aún no incluye la lectura local de imágenes.');
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Activa la cámara para tomar la foto o elige una imagen existente.');
          return;
        }
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
            allowsEditing: false,
          });
      await handleResult(result);
    } catch {
      setError('No pudimos leer la imagen en el teléfono. Prueba con una foto más nítida.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!captureOcr.available) return;
    let active = true;
    void ImagePicker.getPendingResultAsync().then((result) => {
      if (active && result)
        void handleResult(result).catch(() =>
          setError('No pudimos recuperar la foto. Selecciónala de nuevo.'),
        );
    });
    return () => {
      active = false;
    };
  }, []);

  if (editing && accepted && savedDraft)
    return (
      <PurchaseEditor
        initial={savedDraft}
        onBack={() => setEditing(false)}
        onSavedImport={() => {
          deleteTemporaryImage(currentUri.current);
          currentUri.current = undefined;
          setPreviewUri(undefined);
        }}
      />
    );

  return (
    <Screen entry scroll style={{ gap: spacing.lg }}>
      <ScreenHeader
        title="Leer comprobante"
        subtitle="La imagen se lee en este teléfono; confirma los datos antes de guardar."
        back
        onBack={() => router.back()}
      />
      {previewUri && (
        <Image source={{ uri: previewUri }} resizeMode="contain" style={{ height: 190, borderRadius: 16 }} />
      )}
      {accepted && (
        <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={typography.cardTitle}>Movimiento sugerido</Text>
          <Text style={typography.bodySecondary}>
            {hidden
              ? 'Importe oculto'
              : accepted.suggestion.amount && accepted.suggestion.currency
                ? formatPrivateMoney(accepted.suggestion.amount, accepted.suggestion.currency, false)
                : 'Importe por comprobar'}
          </Text>
          {accepted.suggestion.warnings.map((warning) => (
            <Text key={warning} style={typography.bodySecondary}>
              {warning}
            </Text>
          ))}
          {detected.errors[draftKey] && (
            <>
              <Text style={typography.bodySecondary}>{detected.errors[draftKey]}</Text>
              <Button variant="secondary" onPress={() => void detected.retry({ intake: accepted })}>
                Reintentar guardado
              </Button>
            </>
          )}
          <Button disabled={busy || !savedDraft} onPress={() => setEditing(true)}>
            {savedDraft ? 'Revisar y corregir' : 'Guardando pendiente…'}
          </Button>
        </Card>
      )}
      {error && <EmptyState title="No pudimos interpretar la imagen" description={error} />}
      <Button loading={busy} disabled={busy} onPress={() => void pick(false)}>
        Elegir imagen
      </Button>
      <Button variant="secondary" disabled={busy} onPress={() => void pick(true)}>
        Tomar foto
      </Button>
      <Button variant="ghost" onPress={() => router.push('/(app)/purchase-review')}>
        Pegar texto en su lugar
      </Button>
    </Screen>
  );
}
