import type { PdfReadResult } from './ocr.android';

/** iOS/web remain usable while on-device OCR is Android-only. */
export const captureOcr = {
  available: false,
  async recognizeImage(_uri: string): Promise<string> {
    void _uri;
    throw new Error('La lectura de imágenes está disponible en la compilación Android.');
  },
  async recognizePdf(_uri: string): Promise<PdfReadResult> {
    void _uri;
    throw new Error('La lectura de PDF está disponible en la compilación Android.');
  },
};
