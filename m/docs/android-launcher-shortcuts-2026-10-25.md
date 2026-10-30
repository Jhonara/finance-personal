# Accesos rápidos del icono en Android

Al mantener presionado el icono de **Finance Personal** en un launcher compatible aparecen cuatro accesos estáticos del sistema: Registrar gasto, Registrar ingreso, Transferir dinero y Consultar saldo. Android los define mediante `ShortcutManager` y el recurso `shortcuts.xml`. El plugin de Expo los vuelve a generar en cada Prebuild; no hay que editar `android/` a mano ni instalar un módulo Kotlin.

## Recorrido

Cada acceso abre `android-shortcut` con solo un identificador permitido. La pantalla pública espera la sesión, comprueba `/me` con el cliente JWT actual y abre el formulario real o Cuentas. Si hace falta iniciar sesión, muestra el formulario existente en la misma ruta y continúa la acción tras entrar. En una sesión vencida se limpian la sesión y la caché privada; ante un fallo de red la acción permanece para reintentar. Los formularios empiezan vacíos y exigen confirmación del usuario. Consultar saldo vuelve a pedir saldos al servidor y respeta la ocultación de importes existente.

La acción no lleva importes, cuentas ni credenciales en la URL. Los formularios siguen usando sus mutaciones, validaciones y guardas originales. El backend, el ledger y los archivos Swift de App Intents no cambian.

## Archivos de esta etapa

- `app.json`: paquete Android y plugin de configuración.
- `plugins/with-android-launcher-shortcuts.cjs`: `AndroidManifest.xml`, `res/xml/finance_shortcuts.xml`, cadenas e iconos de Android; también evita que Gradle de Android intente interpretar la carpeta Swift de iOS como módulos Kotlin.
- `src/app/android-shortcut.tsx` y `src/features/launcher-shortcuts/destinations.ts`: entrada pública, validación de sesión y destinos.
- `src/features/launcher-shortcuts/*.test.tsx` y `launcher-plugin.test.ts`: sesión activa/vencida, fallo de conexión, entrada inválida y recursos nativos.
- `scripts/qa/android-launcher-server.mjs`: servidor local ficticio para pruebas de interfaz, sin conexión con el ledger real.
- `.prettierignore`: excluye carpetas nativas generadas.
- `../.easignore`: limita el archivo que se envía a EAS al proyecto móvil y excluye artefactos locales y documentación.

## Instalación desde Windows

El [APK de desarrollo de esta entrega](https://expo.dev/artifacts/eas/mC3j1K6y8ooLLIDofEtM9ZNnv_yCI6kxppX4MA_Fc08.apk) ya está descargado en `.expo/android-launcher-dev.apk` e instalado en el emulador de pruebas. En Windows, con el emulador encendido, se puede reinstalar así desde `finance-personal-mobile`:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r .expo\android-launcher-dev.apk
```

Para generar otro cliente de desarrollo, usa EAS y descarga el APK nuevo desde el enlace que muestra el comando:

```powershell
npx.cmd eas-cli build --platform android --profile development
$apkPath = 'C:\ruta\al\APK\descargado.apk'
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r $apkPath
npx.cmd expo start --dev-client --lan
```

La compilación de esta entrega [terminó correctamente en EAS](https://expo.dev/accounts/jhonara/projects/finance-personal-mobile/builds/0f46e57e-416a-4941-b117-02e09e2d03b4). También puedes generar el proyecto nativo local con `npx expo prebuild --platform android --no-install`. Para compilarlo localmente se necesitan Java 21 y Android SDK:

```powershell
npx expo prebuild --platform android --no-install
cd android
.\gradlew.bat :app:assembleDebug -PreactNativeArchitectures=x86_64
cd ..
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r android\app\build\outputs\apk\debug\app-debug.apk
```

En la ruta actual de Windows, la compilación local se detiene por el límite de 260 caracteres en archivos C++ generados por React Native. EAS compila en Linux y evita ese límite; para una compilación local, coloca una copia del proyecto cerca de la raíz del disco. El APK de desarrollo toma JavaScript desde Metro; el servidor Spring Boot y el emulador deben alcanzarse por la dirección `EXPO_PUBLIC_API_BASE_URL` de esa sesión. Expo Go no contiene los accesos añadidos al manifiesto de esta app.

Para comprobarlo, vuelve al inicio del emulador, mantén presionado el icono **Finance Personal** y toca cada acceso. Prueba una vez con sesión abierta y otra después de cerrar sesión. En gastos, ingresos y transferencia solo debe aparecer el formulario sin que se registre nada hasta confirmar. En Cuentas deben cargarse los saldos del servidor. Para una sesión vencida, usa únicamente datos de prueba o expira una sesión de pruebas; el formulario de login debe aparecer antes de continuar hacia la misma acción.

## Validación

La generación con Expo Prebuild produjo las cuatro entradas, iconos y cadenas en `android/`, y añadió la referencia `android.app.shortcuts` a `MainActivity`. Las pruebas del móvil: **578/578** (64 archivos). TypeScript, ESLint y Prettier: sin errores. El empaquetado JavaScript de Android y el build nativo EAS terminaron correctamente. El plugin evita que Gradle Android trate la carpeta Swift de iOS como módulos Kotlin. La compilación local en esta ruta llegó al enlace C++, pero se detuvo por la longitud de las rutas de Windows.

En el emulador Android 17 se instaló el APK y se comprobó el menú real al mantener presionado el icono: aparecen los cuatro accesos con sus nombres e iconos. Desde ese menú, **Registrar ingreso** abrió «Nuevo ingreso», **Transferir dinero** abrió «Nueva transferencia» y **Consultar saldo** abrió «Mis cuentas» con dos saldos de prueba. **Registrar gasto** abrió el login en una sesión fría y, tras entrar, abrió «Nuevo gasto» vacío. Al vencer deliberadamente la sesión de prueba y tocar de nuevo el acceso, apareció el login y después continuó hacia «Nuevo gasto». El servidor ficticio registró `financialWrites: []`: abrir los accesos no creó movimientos. Los datos de la cuenta de prueba están aislados de los datos reales.
