# Finance Personal Mobile

Cliente móvil de Finance Personal, construido con Expo, React Native y TypeScript. Incluye autenticación, dashboard, cuentas, operaciones, historial, presupuestos, alertas, ahorros y créditos conectados a la API oficial.

## Requisitos

- Node.js 24 LTS (validado con 24.14.1).
- npm.
- Expo Go compatible con SDK 58 o una compilación de desarrollo de esta versión.
- El backend Finance Personal disponible para las pruebas manuales.

## Inicio local

```powershell
Copy-Item .env.example .env
npm ci
npx expo start --clear
```

Configure `EXPO_PUBLIC_API_BASE_URL` en `.env` según el destino:

- Emulador Android: `http://10.0.2.2:8080/api/v1`
- Simulador iOS: `http://localhost:8080/api/v1`
- Dispositivo físico: una dirección LAN accesible del equipo que ejecuta el backend, por ejemplo `http://192.168.x.x:8080/api/v1`.

No se versiona `.env`. Nunca incluya secretos, refresh tokens ni contraseñas en variables `EXPO_PUBLIC_*`: se incluyen en el bundle de la aplicación.

## Contrato OpenAPI

Los tipos de `src/api/generated/schema.ts` proceden exclusivamente de `/v3/api-docs`; no se editan a mano. Con el backend local iniciado, regenérelos así:

```powershell
$env:OPENAPI_URL = 'http://localhost:8080/v3/api-docs'
npm run api:generate
```

La app usa TypeScript 6.0.3, requerido por Expo SDK 58. `openapi-typescript` 7.13.0 todavía declara compatibilidad con TypeScript 5; por eso se instala con TypeScript 5.9.3 en el workspace privado `tools/openapi`. `npm ci` instala ambos y `api:generate` resuelve el generador desde ese workspace. No se necesitan `--force`, `--legacy-peer-deps` ni exclusiones de Expo Doctor. `OPENAPI_OUTPUT` permite escribir una comprobación en otro archivo sin sobrescribir el contrato de la app.

En el iPhone, mantén el servidor y Expo abiertos, usa la misma red del computador y escanea el QR nuevo después de reiniciar Expo. La migración de paquetes no actualiza automáticamente la app Expo Go del teléfono.

## Arquitectura

- `src/config`: configuración de entorno tipada.
- `src/api`: cliente Axios, mapeo uniforme de errores y tipos OpenAPI generados.
- `src/auth`: login, registro, refresh, cierre de sesión y coordinación single-flight de renovaciones.
- `src/storage`: persistencia del bundle de sesión en Expo SecureStore.
- `src/app`: rutas Expo Router, con grupos protegidos `(app)` y públicos `(auth)`.
- `src/utils`: presentación de dinero y fechas financieras sin alterar cálculos del backend.

Los tokens no se guardan en AsyncStorage. SecureStore conserva el bundle de sesión; al iniciar, se valida renovándolo. Múltiples respuestas 401 comparten una única renovación. Los `POST` no tienen reintento automático.

## Calidad

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npx expo config --type public
npx expo-doctor
```

Las pruebas cubren almacenamiento seguro, ciclo de sesión, refresh single-flight, contratos de error, filtros, fechas y reglas de presentación financiera. En Windows, la validación iOS requiere un dispositivo físico, Mac o EAS; Android puede iniciarse mediante Expo Go o un emulador configurado.

La implementación de acciones nativas de Atajos, los límites actuales de Wallet y los pasos para compilar desde Windows están en [App Intents y EAS](docs/apple-intents-eas-2026-10-24.md). Requieren un binario iOS propio; Expo Go sigue disponible con `npx expo start --go`.
