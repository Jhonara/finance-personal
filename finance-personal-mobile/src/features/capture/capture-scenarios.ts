export type CaptureScenario = {
  id: string;
  eventId: string;
  title: string;
  text: string;
  expected: 'EXPENSE' | 'TRANSFER' | 'IGNORED';
};

/** Fictional examples only. Selecting a scenario never sends data to the server. */
export const captureScenarios = [
  {
    id: 'bancolombia-one',
    eventId: 'bancolombia-one',
    title: 'Bancolombia · primera compra',
    text: 'Bancolombia: Compraste COP 12.500 en Cafetería Ejemplo el 28/10/2026 a las 10:15.',
    expected: 'EXPENSE',
  },
  {
    id: 'bancolombia-two',
    eventId: 'bancolombia-two',
    title: 'Bancolombia · mismo importe, otra hora',
    text: 'Bancolombia: Compraste COP 12.500 en Cafetería Ejemplo el 28/10/2026 a las 11:15.',
    expected: 'EXPENSE',
  },
  {
    id: 'bancolombia-duplicate',
    eventId: 'bancolombia-one',
    title: 'Duplicado exacto de la primera compra',
    text: 'Bancolombia: Compraste COP 12.500 en Cafetería Ejemplo el 28/10/2026 a las 10:15.',
    expected: 'EXPENSE',
  },
  {
    id: 'davivienda-usd',
    eventId: 'davivienda-usd',
    title: 'Davivienda · otra moneda',
    text: 'Davivienda: Pagaste USD 18.50 en Tienda Ejemplo el 28/10/2026 a las 12:10.',
    expected: 'EXPENSE',
  },
  {
    id: 'bbva-incomplete',
    eventId: 'bbva-incomplete',
    title: 'BBVA · comprobante incompleto',
    text: 'BBVA: Compra realizada en Comercio Ejemplo. Revisa el detalle en la app.',
    expected: 'EXPENSE',
  },
  {
    id: 'nequi-transfer',
    eventId: 'nequi-transfer',
    title: 'Nequi · transferencia, no compra',
    text: 'Nequi: Transferiste COP 30.000 el 28/10/2026 a las 09:00.',
    expected: 'TRANSFER',
  },
  {
    id: 'generic-promotion',
    eventId: 'generic-promotion',
    title: 'Promoción · no es un movimiento',
    text: 'Conoce las nuevas promociones de tu banco para este mes.',
    expected: 'IGNORED',
  },
  {
    id: 'security-message',
    eventId: 'security-message',
    title: 'Seguridad · nunca se importa',
    text: 'Tu código de verificación para iniciar sesión está disponible en la app del banco.',
    expected: 'IGNORED',
  },
] satisfies CaptureScenario[];
