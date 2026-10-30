# Captura inteligente de movimientos (Android)

## Contratos y límites

La interpretación se hace en el teléfono y solo produce una **sugerencia**. La fuente nunca llama al ledger. El usuario corrige los datos, guarda un pendiente en `/inbox` y, para gastos ordinarios, confirma explícitamente desde la revisión existente. El servidor mantiene el aislamiento por `userId`, la clave de petición, el control de versión y las coincidencias con movimientos ya registrados. Ingresos, transferencias, pagos de crédito, retiros y reversos quedan como `OTHER`: deben registrarse en su módulo actual y vincularse; no se convierten en gastos por accidente.

No se solicita `READ_SMS`. El texto compartido llega mediante la hoja Compartir de Android, sin credenciales en enlaces. La integración iOS permanece deshabilitada en la configuración de `expo-sharing`; los App Intents existentes no cambian. La acción nativa de Android exige un nuevo APK, no basta una actualización de JavaScript.

## Modelo común

`src/features/capture/interpret-text.ts` define `DetectedMovement` con tipo sugerido, importe, moneda, fecha, descripción, entidad, pista de cuenta, referencia, fuente, confianza y advertencias. Todos los campos extraídos son opcionales. El motor descarta avisos de autenticación y no devuelve el texto original. Prefiere el importe de la operación a un saldo rotulado; si dos importes plausibles compiten, no elige uno. La confianza es una indicación de lectura, nunca una autorización para registrar.

La protección contra duplicados tiene dos niveles: un `requestKey` estable para reintentar la misma creación, y coincidencias del servidor por importe/moneda/fecha/cuenta que obligan a vincular o confirmar que se trata de un movimiento distinto. Un hash corto del texto solo distingue entradas nuevas en la interfaz; **no** se usa como identidad financiera ni para descartar operaciones legítimas iguales.

## Etapas y archivos

| Etapa                            | Archivos principales                                                                                                                                                                         | Dependencias/criterio de salida                                                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Motor común                   | `src/features/capture/interpret-text.ts`, pruebas; adaptador `src/features/inbox/purchase-parser.ts`                                                                                         | Sin dependencia nativa. Pruebas de formatos colombianos, valores múltiples, tipos y OTP.                                                                                                                                        |
| 2. Texto manual y SMS compartido | `src/app/+native-intent.ts`, `src/app/shared-capture.tsx`, `src/app/(app)/inbox.tsx`, `purchase-review.tsx`, `src/auth/auth-provider.tsx`, `app.json`, `InboxDtos.java`, `InboxService.java` | `expo-sharing` para `text/plain` en Android; ruta pública verifica `/me` antes de mostrar; el servidor acepta `SHARED_TEXT` y conserva los controles de la bandeja. APK y prueba del menú Compartir pendientes de verificación. |
| 3. Imagen/OCR                    | Un adaptador de imagen en `src/features/capture/`, ruta de captura y un módulo Android local en `modules/`                                                                                   | `expo-image-picker`; ML Kit Text Recognition v2 Latin empaquetado localmente. Selección y cámara a petición; tamaño/píxeles limitados; borrar temporales. Pruebas de imagen borrosa y de varios importes.                       |
| 4. PDF                           | Adaptador PDF en `src/features/capture/`, mismo módulo Android                                                                                                                               | `expo-document-picker` y lector local (texto + OCR por página). Límite de bytes y páginas, rechazo de archivos protegidos, borrado de copias temporales.                                                                        |
| 5. Notificaciones opcionales     | Servicio Kotlin bajo `modules/`, config plugin Android y ajustes en captura                                                                                                                  | `NotificationListenerService` activado en Ajustes del sistema, lista explícita de apps admitidas por el usuario, filtrado en el dispositivo, sin historial completo ni OTP. Una notificación solo crea un pendiente.            |
| 6. Duplicados y revisión         | `src/features/capture/`, `inbox`, `purchase-review`, servicios de `/inbox`                                                                                                                   | Referencia fiable por entidad cuando exista; estados visibles de incompleto/duplicado y vínculos a movimientos del ledger. No se deduce que dos compras idénticas sean la misma sin referencia.                                 |
| 7. APK y matriz integral         | Pruebas Vitest, JUnit y emulador                                                                                                                                                             | Compartir texto/imagen/PDF, permisos, desconexión, sesión vencida, cambio de usuario, reintentos y comprobación de saldos antes/después de confirmación.                                                                        |

## Seguridad y mantenimiento

- El backend recibe únicamente los campos que la persona decide guardar. El texto completo no se envía ni se registra en logs.
- La hoja Compartir se limpia al cerrar sesión/cambiar de usuario y tras guardar la sugerencia aceptada; un fallo de conexión no la borra. Las copias temporales creadas por Expo Sharing se eliminan al descartarlas, al terminar una importación simple o al desmontarse la pantalla.
- Si la copia temporal de Expo Sharing falla, la app intenta usar el URI original concedido por Android. Si el emisor tampoco otorgó lectura, se muestra un error y no se crea ningún movimiento.
- Los formularios reales de ingreso y gasto conservan sus borradores por usuario y tipo en SecureStore. La bandeja de importaciones guarda pendientes en el servidor solo tras la acción «Guardar para revisar».
- Una captura de transferencia entre cuentas propias no se registra como gasto; debe usarse la transferencia existente, que ya evita la doble contabilización.
- La extensión para bancos concretos debe aportar patrones de referencia o contexto sin sustituir las reglas genéricas ni enviar datos a un servicio de IA externo.

## Fuentes oficiales consultadas

- Expo SDK 58: https://docs.expo.dev/versions/v58.0.0/
- Recepción con Expo Sharing: https://docs.expo.dev/versions/v58.0.0/sdk/sharing/
- ImagePicker: https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/
- DocumentPicker: https://docs.expo.dev/versions/v58.0.0/sdk/document-picker/
- ML Kit Text Recognition v2: https://developers.google.com/ml-kit/vision/text-recognition/v2/android
- NotificationListenerService: https://developer.android.com/reference/android/service/notification/NotificationListenerService
- Política de permisos SMS de Google Play: https://support.google.com/googleplay/android-developer/answer/10208820

## Implementación actual y límites de verificación

- Texto compartido, imagen y PDF usan el mismo intérprete y el formulario de revisión existente. Las imágenes se leen con ML Kit local; el PDF se renderiza y se lee por OCR página por página, incluso cuando su texto es seleccionable. No se añadió una biblioteca de extracción directa de texto PDF. Se admiten hasta 10 MB y ocho páginas; documentos protegidos o dañados muestran un error, sin subir el archivo.
- La captura de notificaciones es opcional. Android concede al servicio acceso de sistema a las notificaciones; Finance Personal solo lee el contenido de las aplicaciones que el usuario seleccione en «Avisos bancarios». Antes de seleccionar una app solo se guardan sus identificadores de paquete observados. Una vez seleccionada, únicamente posibles movimientos pasan a una cola local de hasta 20 elementos cifrada con Android Keystore. No hay lectura automática de SMS.
- Desactivar esta función, cerrar sesión o iniciar con otra cuenta borra la cola. Los elementos se retiran al descartarlos o después de guardar correctamente un borrador en el servidor. El permiso del sistema se revoca por separado en Ajustes de Android.
- El identificador `possible-*` agrupa sugerencias con el mismo tipo, importe, moneda y fecha entre fuentes; es una pista y puede coincidir para dos compras distintas. El servidor sigue haciendo la comprobación decisiva de duplicados antes de confirmar. Las referencias y pistas de cuenta no se envían a `/inbox` automáticamente.
- Una notificación repetida con el mismo texto y fecha de publicación se ignora. Dos compras con el mismo texto publicadas en momentos distintos permanecen separadas para revisión.
- El PDF se procesa localmente mediante OCR página a página; una página con varios movimientos puede requerir corrección o importación por separado. No se almacenan los archivos de entrada en el servidor.

## Verificación de esta etapa

- `npm run typecheck`, `npm run lint`, `npm run format:check` y 622 pruebas móviles pasaron. `npx expo-doctor` informó 20/20 comprobaciones correctas antes de los últimos cambios de interfaz (sin cambios posteriores en dependencias).
- La prueba `InboxIntegrationTest` pasó con H2: creación idempotente para texto, imagen, PDF y notificación; aislamiento por usuario; historial de confirmados y descartados; coincidencias; y ledger intacto hasta confirmar.
- `:finance-capture-ocr:compileDebugKotlin` y la fusión del manifiesto Android pasaron. El manifiesto registra el receptor de Compartir y el servicio de notificaciones; no solicita `READ_SMS`.
- El build Android de desarrollo `6678daeb-facc-48a2-8256-3d4550ccde60` terminó y se instaló en el emulador. Se abrió la sesión real; un aviso de texto ficticio se interpretó y guardó como pendiente, luego se descartó. El historial mostró el descarte y los campos sensibles se borraron. No se confirmó ningún movimiento contable durante estas pruebas.
- En ese APK, una imagen ficticia se eligió de la galería y ML Kit reconoció un importe de 12.345 COP. Un PDF ficticio de dos páginas se abrió en el selector y el módulo local encontró un movimiento posible en la primera página. Un intent `ACTION_SEND` de texto abrió la revisión con 19.876 COP, sin guardarlo. Los formatos y avisos de bancos reales, imágenes ilegibles, PDF protegidos, notificaciones con permiso concedido, reconexión, reinicio y cambio de usuario en dispositivo siguen pendientes de una prueba guiada; los controles correspondientes tienen pruebas de código.
- Un `ACTION_SEND` de imagen con un archivo ficticio legible para la app también abrió la revisión y reconoció 12.345 COP. Otro `ACTION_SEND` entregó un PDF ficticio de dos páginas y mostró el movimiento de la primera. Un intent artificial que apuntaba al proveedor multimedia sin conceder lectura falló de forma segura, sin crear un borrador. Estas pruebas no equivalen a compartir desde la interfaz real de otra aplicación; ese caso queda pendiente.
- La corrección de deduplicación de notificaciones pasó `:finance-capture-ocr:compileDebugKotlin` local. Un segundo APK de desarrollo, `e7885e0d-bc59-4fcc-8e37-09095a1b08f7`, terminó correctamente en EAS: https://expo.dev/accounts/jhonara/projects/finance-personal-mobile/builds/e7885e0d-bc59-4fcc-8e37-09095a1b08f7. La prueba con notificaciones bancarias auténticas sigue pendiente de activar el permiso y elegir explícitamente una app en Android.
- Ese APK se instaló con `adb install -r` en `emulator-5554`. El primer arranque tardó en recibir el paquete de Metro y Android mostró temporalmente «no responde»; tras seleccionar «Esperar» y abrir explícitamente el enlace del cliente de desarrollo a `127.0.0.1:8082`, Finance Personal cargó Inicio con la sesión existente. No se observó un cierre de la app. La deduplicación nativa nueva está compilada, pero aún no se ha provocado una pareja real de notificaciones idénticas para medirla en dispositivo.
- En el APK actualizado se abrió Movimientos → Movimientos detectados → Avisos bancarios. Sin permiso de Android, «Activar detección» permanece deshabilitado y la pantalla muestra cero pendientes; no se activó el acceso ni se eligió una aplicación durante QA.

## Repetir en Windows

1. Descargar el APK desde el enlace del segundo build de EAS e instalarlo en el emulador con `adb -s emulator-5554 install -r <ruta-del-apk>`.
2. Iniciar el backend como de costumbre y Metro desde `finance-personal-mobile` con `npx expo start --dev-client --port 8082 --localhost`. En otra terminal ejecutar `adb -s emulator-5554 reverse tcp:8082 tcp:8082`.
3. Si el cliente no carga solo, abrir `exp+finance-personal-mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8082` en el emulador. Entrar a Movimientos → Movimientos detectados. Pegar o compartir únicamente comprobantes ficticios y comprobar que el saldo no cambia hasta «Confirmar y registrar gasto».
