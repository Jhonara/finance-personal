import { requireOptionalNativeModule } from 'expo';

export type PdfReadResult = { pageCount: number; pages: { page: number; text: string }[] };
type NativeCaptureOcr = {
  recognizeImage(uri: string): Promise<string>;
  recognizePdf(uri: string): Promise<PdfReadResult>;
};
const native = requireOptionalNativeModule<NativeCaptureOcr>('FinanceCaptureOcr');

export const captureOcr = {
  available: native !== null,
  async recognizeImage(uri: string): Promise<string> {
    if (!native) throw new Error('Esta compilación aún no incluye la lectura de imágenes.');
    return native.recognizeImage(uri);
  },
  async recognizePdf(uri: string): Promise<PdfReadResult> {
    if (!native) throw new Error('Esta compilación aún no incluye la lectura de PDF.');
    return native.recognizePdf(uri);
  },
};
