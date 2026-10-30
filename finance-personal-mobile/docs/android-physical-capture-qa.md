# Validación de captura inteligente en un Android físico

Esta guía prepara pruebas; **no equivale a una validación en teléfono**. El simulador y el diagnóstico aparecen únicamente en desarrollo o en el perfil `capture-physical-qa`. Ningún escenario se ejecuta al abrir la pantalla. La única acción de prueba que escribe en el servidor pide confirmación y crea un **pendiente**, nunca un gasto contable.

El diagnóstico conserva por usuario hasta 30 decisiones con códigos fijos y fecha, sin copiar textos ni respuestas de error. Los eventos del lector nativo se guardan cifrados con Android Keystore; el historial de la app usa SecureStore. Al cambiar de usuario, la pantalla exige verificar la nueva sesión antes de mostrar esos datos. Una última sincronización antigua indica que la cola todavía no se pudo comprobar con el servidor.

## Antes de instalar

1. Usa una cuenta de prueba. Conserva una captura o anotación del saldo inicial y del número de pendientes. No pegues aquí contraseñas, códigos OTP, números de tarjeta, textos bancarios completos ni tokens.
2. Comprueba que el teléfono llega al backend en `http://192.168.1.55:8080/v3/api-docs` desde el navegador del teléfono. `10.0.2.2` funciona solo en el emulador. La URL local se incluye en el APK QA y puede cambiarse en la pantalla de inicio de sesión; nunca contiene credenciales.
3. La primera instalación puede hacerse desde el navegador o Archivos del teléfono, sin USB ni Metro. Si Android indica que la firma no coincide con una instalación anterior, **no desinstales** sin respaldar antes los datos locales de prueba; cancelar la instalación es seguro.
4. El APK QA debe incluir el módulo nativo `finance-capture-ocr` para lector de avisos, OCR de imágenes y PDF. Un paquete anterior no incorpora cambios Kotlin aunque el JavaScript haya cambiado.

## APK de desarrollo

1. Instala el APK de desarrollo de Finance Personal con `adb install -r RUTA_DEL_APK.apk` o desde el enlace de una compilación EAS de desarrollo. Si se instaló una versión con firma distinta, Android puede pedir desinstalarla; antes, respalda los datos locales de prueba.
2. En PowerShell, dentro de `finance-personal-mobile`, establece `EXPO_PUBLIC_API_BASE_URL` con la dirección accesible desde el teléfono y ejecuta `npx expo start --dev-client --host lan`. El teléfono y el computador deben estar en la misma red y Metro debe seguir abierto. Si el backend local usa HTTP, comprueba que el APK de desarrollo lo permite; un release no debe depender de esa excepción.
3. Abre Finance Personal desde el icono, enlaza el servidor de Metro e inicia sesión. Ve a **Perfil y ajustes → Diagnóstico de captura**. Comprueba servidor, permiso para mostrar avisos, permiso para leer avisos bancarios y última sincronización.
4. En **Avisos bancarios**, concede el acceso de lectura en Android, activa la detección y selecciona explícitamente la app emisora. El permiso para mostrar notificaciones de Finance Personal es independiente. Deja ocultos importe y comercio para la prueba con pantalla bloqueada.

## APK autónomo de QA con Spring Boot local

El perfil `capture-physical-qa` de `eas.json` incorpora `http://192.168.1.55:8080/api/v1`, habilita el diagnóstico y permite HTTP **solo en el APK QA**. Producción conserva la política normal de Android. Si el computador cambia de IP, cierra sesión, ve a la pantalla de acceso y toca **Cambiar IP del computador**. Solo se aceptan direcciones privadas con puerto 8080. No uses `detected-qa`: apunta a `10.0.2.2`, exclusivo del emulador. No necesitas Supabase, Metro ni Expo Dev Client para ejecutar el APK autónomo. EAS se usa solo para compilar cuando haya cuota; la API y la base de datos siguen siendo locales.

En Windows, PostgreSQL debe estar iniciado (servicio `postgresql-x64-18`). Abre la configuración de Spring Boot que ya utilizas en IntelliJ, con tus variables locales de base de datos y JWT; espera a que escuche en el puerto 8080. No copies esas variables al APK. En una terminal ejecuta `ipconfig`: usa la IPv4 del adaptador conectado al mismo router que el Wi-Fi del teléfono. En este equipo es `192.168.1.55` con máscara `255.255.255.0`.

Windows identifica ahora Ethernet «Red 2» como red pública. Para permitir **solo** esta red doméstica, abre PowerShell **como administrador** y, únicamente si confirmas que es tu red de confianza, ejecuta:

```powershell
Set-NetConnectionProfile -InterfaceAlias 'Ethernet' -NetworkCategory Private
New-NetFirewallRule -DisplayName 'Finance Personal QA LAN API 8080' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 -Profile Private -RemoteAddress '192.168.1.0/24'
```

Comprueba luego desde el navegador del Xiaomi que `http://192.168.1.55:8080/v3/api-docs` responde. Una red de invitados o el aislamiento de clientes Wi-Fi puede impedir la conexión aun con el firewall configurado. PostgreSQL (5432) no necesita regla de entrada y nunca se conecta directamente al teléfono.

Un APK de desarrollo permite ensayar formularios, permisos, lector nativo y navegación mientras Metro está conectado. Para evaluar de forma representativa el arranque en frío, el cierre del proceso y la captura prolongada sin Metro, utiliza el APK autónomo. La notificación inmediata de una compra detectada mientras solo vive el servicio nativo sigue siendo un límite conocido: el candidato se guarda cifrado y se sincroniza cuando la app vuelve a estar activa.

## Recorrido en el teléfono

1. Abre **Diagnóstico de captura → Simulador de compras**. Selecciona cada ejemplo y compara el resultado con su título. El duplicado exacto comparte clave; dos compras iguales con hora distinta tienen claves diferentes. Los mensajes de seguridad y promociones deben ser ignorados. El comprobante incompleto debe pedir completar datos.
2. Si quieres probar el recorrido completo, pulsa **Crear pendiente de prueba**, confirma, comprueba que aparece en **Movimientos detectados** y descártalo. No pulses **Confirmar gasto** con datos ficticios. Compara el saldo con el inicial.
3. Envía una notificación bancaria real desde una app permitida, primero con Finance Personal abierta y luego en segundo plano. Comprueba que se crea un único pendiente y un único aviso local. Repite la misma notificación sin cambiar su evento; no debe duplicarse. Para dos compras reales de igual importe y comercio, verifica que horas o identificadores de evento distintos producen dos pendientes.
4. Bloquea la pantalla antes de otra compra. El aviso de Finance Personal no debe mostrar importe ni comercio con las opciones apagadas. Tócalo: debe pedir autenticación si venció la sesión y luego abrir el pendiente correcto del mismo usuario.
5. Deniega solo el permiso **para mostrar** notificaciones. Una compra todavía debe quedar en Movimientos detectados, sin aviso local. Restáuralo después.
6. Desconecta internet antes de recibir una compra. Comprueba que el candidato permanece en la cola local y que el diagnóstico explica la falla. Reconecta y vuelve a la app: debe aparecer un solo pendiente. Si el servidor guardó pero la respuesta se perdió, el reintento usa la misma clave; comprueba que el historial no tiene dos pendientes.
7. Cierra la app y recibe otra notificación autorizada. Al reabrirla, comprueba la sincronización de la cola. No esperes un aviso local inmediato durante el cierre completo sin una implementación nativa adicional.
8. Cierra sesión y entra con otra cuenta de prueba. No deben aparecer el detalle, la cola ni los avisos de la cuenta anterior. Repite con una sesión vencida. Las preferencias de avisos y el diagnóstico deben corresponder al usuario actual.
9. Comparte texto o una imagen, e importa un PDF de prueba con páginas diferentes. Confirma que cada sugerencia termina en revisión, que los archivos originales no se muestran en los registros y que el ledger solo cambia después de una confirmación expresa.

Registra cada resultado en [el informe de pruebas](android-physical-capture-report.md). Al terminar, desactiva la lectura bancaria si ya no la necesitas y descarta los pendientes ficticios.

## Preparación verificada en este equipo

- Vitest móvil: 78 archivos y 655 pruebas aprobadas el 28/10/2026, incluidos el ajuste de servidor local y el aislamiento de HTTP a QA.
- TypeScript, ESLint y Prettier: correctos el 28/10/2026.
- El Prebuild regeneró el manifiesto Android con `usesCleartextTraffic=true` para el perfil QA local y conservó los accesos rápidos. La compilación nativa, la verificación de Flyway en PostgreSQL local y las pruebas físicas se documentarán por separado según su resultado real.

Referencias oficiales: [Expo SDK 58 Notifications](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/), [APK en Android](https://docs.expo.dev/build-reference/apk/) y [variables de entorno EAS](https://docs.expo.dev/eas/environment-variables/usage/).
