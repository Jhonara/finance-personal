# Lectura de comprobantes: validación del 31 de octubre de 2026

## Fallos encontrados

El recorrido real de la aplicación detectó dos problemas adicionales:

1. En la factura fotografiada aportada por el usuario, la lectura encontraba la fecha pero dejaba el importe vacío y proponía `&AMPESND` como comercio.
2. En una factura PDF de prueba, el total y la fecha eran correctos, pero el comercio aparecía como `Moneda: COP`, aunque la primera línea era `QA31 MERCADO DE PRUEBA`.

No era un problema de reconocimiento del número en la primera fotografía. Se ejecutó ML Kit 16.0.1, la misma dependencia productiva, sobre el archivo original de 2880 × 3840 píxeles con orientación EXIF normal. Su resultado incluía los dos importes `78.300`, pero emitía bloques de columnas separados: las etiquetas `Subtotal`, `Total venta` y `Tipo de pago` no quedaban junto a sus valores. El intérprete buscaba el número en la misma línea o en la siguiente y no podía asociarlo con certeza.

El nombre incorrecto tenía dos causas distintas. El logo decorativo se reconocía como `&AMPESND` antes del nombre legible. Además, el filtro de comercios descartaba cualquier línea con dígitos, de modo que rechazaba nombres válidos como `QA31 MERCADO DE PRUEBA` o `7 ELEVEN` y aceptaba posteriormente la línea de moneda.

## Correcciones

- `OcrTextLayout.java` reconstruye filas físicas con las posiciones y el ángulo de las líneas reconocidas. Ordena cada fila de izquierda a derecha, mantiene separadas las líneas siguientes y no combina cajas superpuestas.
- `FinanceCaptureOcrModule.kt` usa el mismo helper para imágenes y páginas PDF, tanto en la lectura original como en el reintento con contraste. El contrato sigue devolviendo el mismo texto al intérprete; no se suben imágenes ni se registran sus textos en logs productivos.
- `interpret-text.ts` conserva dígitos cortos en nombres comerciales, mantiene excluidos identificadores largos y metadatos de moneda, y prioriza el candidato inmediatamente anterior al identificador fiscal frente a un logo mal reconocido.

La reconstrucción solo organiza el texto que ML Kit reconoció. No completa números que no estén presentes ni transforma una sugerencia en una operación financiera confirmada.

## Evidencia y pruebas

Se construyó un harness Android independiente, `com.jr.financeocrqa`, con la misma versión de ML Kit y sin permiso de red. El harness copia mediante Gradle el helper productivo para que la comparación no dependa de una implementación alternativa. Su entrada y salida quedan en el almacenamiento privado de esa aplicación de pruebas.

La factura real pasó por dos variantes: original y contraste con el mismo muestreo que emplea el módulo productivo. La salida reconstruida contiene:

```text
Subtotal $ 78.300
Total venta $ 78.300
Tipo de pago Tarjeta débito
```

El intérprete se ejecutó contra las dos salidas nativas reales, por las rutas `IMAGE` y `PDF`. Las cuatro combinaciones devolvieron:

| Campo                                  | Resultado                            |
| -------------------------------------- | ------------------------------------ |
| Tipo                                   | Gasto                                |
| Importe                                | 78.300 COP                           |
| Fecha y hora                           | 24 de octubre de 2026, 19:30         |
| Comercio                               | MERCAFRUVER EL CAMPESINO             |
| Confianza                              | Alta                                 |
| Advertencias de campos faltantes       | Ninguna                              |
| Identificador orientativo de duplicado | El mismo en las cuatro combinaciones |

Comprobaciones ejecutadas:

- **5 pruebas JUnit** en el proyecto productivo con `:finance-capture-ocr:testDebugUnitTest`, incluidas la compilación Kotlin/Java real y coordenadas obtenidas del OCR de la factura original y su variante con contraste. También cubren columnas de un datáfono, rotación leve y cajas superpuestas.
- **22 pruebas del intérprete** aprobadas, incluidas las regresiones de nombres con dígitos, metadatos de moneda y logo mal reconocido.
- **4 comprobaciones adicionales** sobre el JSON nativo real, fuera de la suite permanente para no depender de archivos privados de una sesión local.
- ESLint y formato de los archivos TypeScript modificados correctos.

Evidencia local ignorada por Git:

- `.tmp/full-qa-20261031/ocr-result.json`: salida original de ML Kit, con la causa del error.
- `.tmp/full-qa-20261031/ocr-result-fixed.json`: salida nativa con el helper productivo.
- `.tmp/ocr-qa/live-parser-result.json`: campos interpretados en las cuatro combinaciones.
- `.tmp/ocr-qa/production-module-tests.log`: compilación y pruebas del módulo real.

La comprobación anterior demuestra la lectura nativa y su interpretación. La prueba de la pantalla final con el APK completo actualizado se registra por separado en el recorrido general de la aplicación.

## Referencias técnicas

Se conservaron la biblioteca y el procesamiento local existentes. La API de [ML Kit para Android](https://developers.google.com/ml-kit/vision/text-recognition/v2/android) expone bloques, líneas y elementos; [Text.Line](https://developers.google.com/android/reference/com/google/mlkit/vision/text/Text.Line) proporciona el texto, las posiciones y el ángulo utilizados para ordenar las filas.
