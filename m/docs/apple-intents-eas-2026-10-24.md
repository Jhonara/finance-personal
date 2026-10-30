# App Intents, compras de Wallet y compilación iOS

Estado: código implementado, pruebas automatizadas correctas y **compilación nativa de simulador iOS completada en EAS**. Se inspeccionó el binario y contiene las cinco acciones y su proveedor. **La ejecución en Atajos y las compras de Wallet siguen sin validarse en un iPhone físico.** Expo Go no incorpora estos archivos Swift; su apertura anterior no valida esta integración.

## Auditoría y decisiones

- Expo 58.0.19, React Native 0.88.0, React y react-test-renderer 19.3.0; TypeScript 6.0.3 en la app. La herramienta OpenAPI conserva TypeScript 5.9.3 en su workspace aislado.
- `expo install --check`: dependencias alineadas. Expo Doctor inicial: 20/20.
- Instalados `expo-app-intents ~0.5.12` y `expo-dev-client` con la versión indicada por SDK 58. La biblioteca de App Intents sigue en alfa.
- El código Swift pertenece al target de la app mediante `experiments.inlineModules.watchedDirectories`. Expo detecta `AppIntentsSetup` y los seis archivos Swift. EAS completó después su compilación y la extracción de metadatos de Apple; se inspeccionó el artefacto final.
- Las cuentas actuales son BANK, SAVINGS, DIGITAL_WALLET, CASH, INVESTMENT y OTHER. Los créditos actuales son préstamos amortizables, no tarjetas revolventes. No se cambió su modelo ni el ledger.
- La auditoría de npm conserva 12 avisos previos (2 moderados, 9 altos, 1 crítico). No se aplicaron actualizaciones forzadas ni cambios de SDK para ocultarlos.

## Acciones incluidas

| Acción nativa             | Comportamiento implementado                                                                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registrar gasto           | Recibe importe, concepto, moneda y fecha opcional; guarda una invocación segura. Con sesión y conexión crea un borrador mediante Spring Boot. El usuario completa cuenta/categoría y confirma en la revisión existente. |
| Importar compra de Wallet | Recibe campos opcionales y los conserva sin inventar valores. Crea un borrador, nunca un asiento automático.                                                                                                            |
| Registrar ingreso         | Abre el formulario actual; el importe, la cuenta y la confirmación se completan en la app.                                                                                                                              |
| Registrar transferencia   | Abre el formulario actual entre cuentas; no transfiere dinero sin confirmación en la app.                                                                                                                               |
| Consultar saldo           | Abre Cuentas y solicita actualizar datos del servidor. Respeta privacidad y monedas. No devuelve un número a Siri ni un resultado utilizable como variable de Atajos.                                                   |

Las últimas tres acciones son entradas nativas a flujos existentes, todavía no operaciones parametrizadas en segundo plano. Todas usan `AppIntent`, `AppShortcutsProvider` y autenticación local del dispositivo; abren la app. No usan URLs como transporte de datos. Sus diálogos dicen lo que realmente ocurre, sin anunciar una transacción confirmada por haberla encolado.

## Persistencia, sesión e integridad

`FinanceIntentStore` guarda las invocaciones en Keychain con `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, sin sincronización iCloud. Conserva el propietario y el identificador UUID. No guarda JWT, contraseñas ni números completos de tarjeta. No se publica un catálogo de saldos en Siri.

La cola admite 100 entradas y **rechaza una nueva con error explícito si está llena**. Nunca elimina entradas antiguas por espacio. Una lectura corrupta o un error de escritura no reinicia la cola. Cambiar de usuario conserva sus pendientes aislados; solo se entregan los del usuario activo. Cerrar sesión borra el propietario activo, no sus invocaciones.

La cola predeterminada de `expo-app-intents` usa UserDefaults, tiene entrega al menos una vez y descarta entradas antiguas al superar su límite. Por eso solo recibe notificaciones sin datos (`financePending`). La invocación financiera real está en Keychain. La biblioteca se conserva para integración nativa y actualización de App Shortcuts; no se parcheó `node_modules`.

El consumidor verifica `/me` y utiliza el cliente HTTP/JWT/renovación existente. Envía `ownerId` y el servidor lo compara con el principal autenticado. No pone credenciales en parámetros, URLs ni Atajos. La compra solo se retira de Keychain después de un recibo válido del servidor; si falla la respuesta o el borrado local, se reintenta con el mismo identificador. Las acciones de navegación se retiran al observar su pantalla de destino. Un usuario puede descartar explícitamente una entrada local desde Atajos y tarjetas.

El servidor reutiliza `PurchaseDraft`, `InboxService`, coincidencias, bloqueo del usuario y confirmación existente del ledger. El identificador de evento, si existe, permite deduplicar entregas separadas; de lo contrario se usa el UUID de la invocación. No hay un identificador universal garantizado por Wallet: dos ejecuciones distintas sin identificador pueden producir dos borradores. La revisión de coincidencias evita confirmarlos inadvertidamente; solo una confirmación explícita como compra distinta permite otro gasto.

Descartar un borrador conserva una marca con su clave y huellas para que un reintento no lo recree, y borra los campos de importe, cuenta, categoría, fecha y tarjeta. Crear o descartar borradores no cambia saldos ni reportes.

## Tarjetas y datos de Wallet

La pantalla anterior de tutoriales se sustituyó por **Atajos y tarjetas**, con vinculación, edición, desvinculación, reintento y descarte. La importación manual de texto y los enlaces anteriores se conservan por compatibilidad, pero no son la integración nativa nueva.

- Débito: enlaza una cuenta BANK, SAVINGS o DIGITAL_WALLET activa. La cuenta solo se sugiere si la moneda recibida coincide; no se convierte dinero.
- Crédito: la cuenta vinculada representa desde dónde se paga la tarjeta, no dónde se registra la compra. La compra queda pendiente y el servidor bloquea confirmarla como salida bancaria, incluso después de editar el borrador.
- Sin tarjeta reconocida: queda pendiente. En la revisión se puede elegir una tarjeta ya vinculada. Una compra identificada como crédito no puede convertirse a débito mediante ese selector.
- Se guarda un alias/referencia corta, nunca PAN completo, CVV, token de Wallet o contraseña bancaria.

Apple documenta el activador personal **Transacción / Cuando use sin contacto**. No ofrece a esta app acceso general al historial de Apple Pay ni garantiza en esa página un conjunto estable de propiedades para todos los bancos, tarjetas y versiones de iOS. Hay que comprobar las variables disponibles en el iPhone antes de mapearlas. No se inventan monto, moneda, comercio, fecha ni tarjeta cuando falten.

Para la prueba nativa posterior, agregar `Importar compra de Wallet` a esa automatización y conectar únicamente las variables que el sistema muestre. Si la tarjeta no expone referencia, asignar un alias fijo exclusivo para la tarjeta seleccionada en ese activador. La fecha opcional conserva la hora y el desfase recibidos; no se sustituye por la hora de ejecución. El identificador de compra es opcional: no generar uno nuevo en cada reintento si existe un identificador del evento original.

Datos simulados usados en pruebas: importe 12.500,25 COP, comercio Café, fecha `2026-10-24T12:10:00-05:00`, alias `visa-personal`, referencia `bank-event-123`. Son fixtures locales; no se han registrado compras en la cuenta real del usuario.

## Archivos por etapa

1. Configuración: `package.json`, `package-lock.json`, `app.json`, `eas.json` y `.easignore` en la raíz del repositorio. Este último limita el archivo de EAS a la app móvil y excluye servidor, credenciales, `.env`, cachés y resultados locales.
2. Swift: `app-intents/AppIntentsSetup.swift`, `AppShortcuts.swift`, `FinanceIntentStore.swift`, `RegisterExpenseIntent.swift`, `ImportWalletPurchaseIntent.swift`, `FinanceEntryIntents.swift`.
3. Móvil: `src/features/shortcuts/` contiene puente por plataforma, validación, consumidor, entradas a pantallas, API de tarjetas y componente de revisión. Integración en `src/app/_layout.tsx` y `src/auth/auth-provider.tsx`.
4. Pantallas: `src/app/(app)/shortcuts.tsx`, `inbox.tsx`, `purchase-review.tsx`; etiquetas en `src/features/inbox/shortcut-intake.ts`. Se reutilizan selectores, guardas de formulario y componentes existentes.
5. Servidor: paquete `api/inbox` con ampliaciones de `InboxDtos`, `InboxController`, `InboxService`, `PurchaseDraft` y nuevos `WalletCard`, `WalletCardRepository`, `WalletCardService`, `WalletCardController`. Nueva migración `V21__native_purchase_intents.sql`.
6. Contrato: `src/api/generated/schema.ts`, generado desde OpenAPI exportado por las pruebas del servidor, no editado manualmente.
7. Pruebas: `InboxIntegrationTest`, `NativeInboxMigrationTest`, y las suites `native-processor`, `native-entry`, `native-provider` del móvil.

## Compilar desde Windows con EAS

El identificador provisional del bundle es `com.jr.financepersonal`. Antes de la primera firma, comprobar que pertenece al proyecto/equipo elegido. No se han creado certificados ni comprado membresías. El usuario autorizó explícitamente subir el código y consumir una compilación de simulador en su cuenta personal.

Proyecto creado y vinculado: `@jhonara/finance-personal-mobile`, ID `a2a2d5ce-44fa-4c34-bd90-027c2e0180c0`. Se inspeccionó el archivo antes de enviarlo: 340 archivos, 3,41 MB sin comprimir; incluye las seis fuentes Swift y el workspace OpenAPI, sin `.env` ni archivos de firma. EAS subió un archivo comprimido de 1,9 MB.

Primera compilación: [15705bfb-4b57-425b-89bc-29cdeaf07f8c](https://expo.dev/accounts/jhonara/projects/finance-personal-mobile/builds/15705bfb-4b57-425b-89bc-29cdeaf07f8c), perfil `ios-simulator`, **FINISHED / BUILD SUCCEEDED**. Finalizó el 24 de octubre de 2026 a las 20:00:36 de Bogotá (25 de octubre, 01:00:36 UTC). No fue necesario repetir el build.

Máquina de EAS: macOS Tahoe 26.6.2, Xcode 27.1 (27A9275), imagen `macos-tahoe-26.6-xcode-27.1-sdk-58`. Compiló para simuladores arm64 y x86_64, con destino mínimo iOS 16.4. `ExtractAppIntentsMetadata` y `AppIntentsSSUTraining` terminaron correctamente.

Se descargó el artefacto propio (65.978.970 bytes) y se comprobó `FinancePersonal.app/Metadata.appintents/extract.actionsdata`: cinco acciones descubribles, cinco App Shortcuts y proveedor `FinanceAppShortcuts`. Registrar gasto conserva importe, comercio y moneda obligatorios y fecha opcional; los seis campos de Wallet son opcionales. Las otras tres acciones conservan su comportamiento de abrir el flujo existente.

SHA-256 del archivo de simulador: `9746eded2400473f8e4958c30fb7c079f535349343046720620140c060e809ca`.

Los registros muestran avisos de cabeceras y módulos precompilados de Expo, rutas de herramientas de Xcode y fases sin salidas declaradas; **ningún error de compilación** ni avisos atribuidos a las seis fuentes propias. La extracción de frases de voz utiliza el idioma base `en` aunque los títulos y frases están escritos en español. La localización de Siri en español queda pendiente de ajustar y verificar antes de ofrecer invocación por voz; este resultado confirma los metadatos de las acciones, no el reconocimiento de voz ni su ejecución.

En la carpeta `finance-personal-mobile`:

```powershell
npm ci
npx eas-cli@latest login
npx eas-cli@latest project:info
```

El proyecto ya está vinculado en `app.json`; no ejecutar `init` para crear un duplicado ni sustituir su `extra.eas.projectId`. En una copia sin vincular, usar `npx eas-cli@latest project:init --id a2a2d5ce-44fa-4c34-bd90-027c2e0180c0`. Configurar `EXPO_PUBLIC_API_BASE_URL` en el entorno development de EAS con una API alcanzable para un build que incluya JavaScript. Usar HTTPS para despliegues compartidos. Los valores `EXPO_PUBLIC_*` se incluyen en el binario: nunca colocar JWT, claves o contraseñas en ellos. Este build de desarrollo recibe JavaScript y configuración de Metro; no se subió `.env` ni se configuró una API pública en EAS. La API local y Metro deben ser accesibles desde el dispositivo en la red de prueba; la dirección del emulador `10.0.2.2` no sirve para un iPhone físico.

Para comprobar compilación sin Apple Developer:

```powershell
npx eas-cli@latest build --platform ios --profile ios-simulator
```

Este perfil produce un binario de simulador. No se instala en el iPhone y Windows no ejecuta el simulador de Apple. Un build exitoso comprueba Swift y extracción de metadatos, pero no demuestra que una tarjeta real entregue datos.

Para instalar en un iPhone físico usando EAS se necesita Apple Developer activo y firma. Una vez disponible:

```powershell
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client --lan
```

Registrar el iPhone, completar las credenciales en EAS sin compartir contraseñas por chat e instalar el build firmado. Abrir Finance Personal e iniciar sesión para asociar las acciones al usuario. Usar el perfil `preview` cuando se quiera un binario con JavaScript incluido y API configurada, sin depender de Metro. Los perfiles usan la imagen de compilación que EAS seleccione para SDK 58; verificar en sus logs que es compatible con React Native 0.88 y las APIs usadas.

El backend necesita cargar V21 al reiniciarse antes de probar esta versión. No se han aplicado cambios sobre la base del usuario durante las pruebas. No ejecutar un rollback destructivo de la migración; conservar los borradores.

## Resultados automatizados del 24 de octubre de 2026

- Expo Doctor final: **20/20**, sin incompatibilidades detectadas; `expo install --check` correcto.
- TypeScript: **0 errores**. ESLint: sin errores.
- Vitest: **559 pruebas, 62 archivos**, todo correcto. Incluye retención por errores, sesión/cambio de usuario, respuesta perdida, fallo al reconocer el recibo, guardas de crédito/débito y navegación sin mutaciones financieras.
- Servidor: **23 pruebas**, 0 fallos y 0 errores: InboxIntegrationTest (16), NativeInboxMigrationTest (1), AccountIntegrationTests (4), TransactionHistoryIntegrationTests (2).
- Migración: comprobada con H2 en modo PostgreSQL sobre el esquema previo y sus restricciones; no sustituye una ejecución de Flyway sobre PostgreSQL real.
- Descubrimiento de módulos: un `AppIntentsSetup`, seis archivos Swift, ningún módulo Kotlin añadido.
- Exportación JavaScript de iOS, Android y web: correcta. No equivale a compilación nativa ni prueba visual en dispositivo.
- `expo prebuild --platform ios --no-install`: no ejecutable en Windows con este SDK; el comando indica usar macOS o Linux. **No se ha compilado Swift localmente.**
- EAS iOS Simulator: **FINISHED**, Swift sin errores, extracción de metadatos correcta; cinco acciones y cinco App Shortcuts comprobados dentro del binario. El Expo Doctor remoto también pasó.

## Criterios pendientes en iOS

1. Instalar un build firmado en el iPhone y ver las cinco acciones bajo Finance Personal en Atajos. La compilación Swift y `ExtractAppIntentsMetadata` ya están verificadas para simulador; el artefacto no se ejecutó en un simulador ni en el teléfono. Ajustar y comprobar la localización de las frases antes de ofrecer Siri en español.
2. Probar Registrar gasto en frío y en caliente; confirmar solo una vez y comprobar el movimiento real en el servidor.
3. Simular pérdida de conexión/respuesta, cierre de app y error de borrado local; verificar mismo recibo tras reintentar.
4. Sesión vencida, cierre de sesión y cambio de usuario: ningún pendiente aparece ni se registra bajo otro usuario.
5. Confirmar el comportamiento con el iPhone bloqueado, el límite de la cola y permisos de red local.
6. Wallet: inspeccionar las variables reales de la tarjeta y probar primero un evento simulado, después una compra voluntaria. Distinguir detectada, pendiente, descartada y gasto confirmado.
7. Crédito no modifica cuenta bancaria; débito solo usa su cuenta y moneda correctas. Comprobar sugerencias/coincidencias al repetir la compra.
8. Verificar Android y el aspecto de la nueva pantalla en un dispositivo. La exportación JS no sustituye esta revisión visual.

## Fuentes primarias consultadas

- [Expo AppIntents para SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/app-intents/), además de código y skill de `expo-app-intents@0.5.12` instalado.
- [Apple: activadores de transacción](https://support.apple.com/es-co/guide/shortcuts/apd65c67538a/ios).
- [EAS: preparar un build](https://docs.expo.dev/build/setup/).
- [EAS: simuladores iOS](https://docs.expo.dev/build-reference/simulators/).
- [EAS: proceso de compilación iOS](https://docs.expo.dev/build-reference/ios-builds/).
