# APK Release local en Windows desde una ruta física corta

Desde la carpeta `finance-personal-mobile`, ejecutar:

```powershell
.\build-android-qa.ps1
```

Si la política local impide ejecutar scripts descargados, se puede usar este proceso puntual, sin cambiar la política del equipo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build-android-qa.ps1
```

El script funciona con Windows PowerShell 5.1 y PowerShell 7. Necesita Node/npm, Java 21, Android SDK/NDK/CMake del proyecto y espacio para una copia de compilación. Usa las versiones fijadas en `package-lock.json` y el Gradle Wrapper existente; no actualiza paquetes ni modifica reglas financieras.

## Uso y resultado

- Ruta física de trabajo predeterminada: `C:\fp`.
- Resultado estable: `outputs\android-qa\FinancePersonal-latest.apk`.
- Se conserva también un APK con fecha e identificador único, su informe JSON, el manifiesto SHA-256 de fuentes y el log Gradle. `latest.json` apunta al archivo fechado y contiene sus hashes, certificado, versión, API y commit.
- Firma: conserva `android\app\debug.keystore`, la misma clave que usa el APK QA instalado. El certificado debe coincidir con `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. No se genera una clave nueva.
- Paquete: `com.jr.financepersonal`. El `versionCode` aumenta respecto al proyecto, el informe anterior y el APK de referencia opcional. El `versionName` incluye la fecha QA. Estos cambios se hacen solo en la copia de compilación.
- Incluye arm64 para el Xiaomi y x86_64 para emuladores. Contiene el JavaScript de producción; no necesita Metro. Sí requiere que la API configurada sea accesible para iniciar sesión y usar datos del servidor.

Para cambiar la IP LAN del computador:

```powershell
.\build-android-qa.ps1 -ApiBaseUrl 'http://192.168.1.55:8080/api/v1'
```

La dirección anterior es el valor predeterminado, comprobado para este equipo. Si cambia, pasar el nuevo valor. No usar `10.0.2.2`, `localhost` ni `127.0.0.1` para el Xiaomi. La versión QA conserva el selector de servidor local ya existente. El script fija sus variables de compilación e ignora `.env` para que una configuración de emulador no se incruste por accidente.

Opciones adicionales:

```powershell
# Comprobar requisitos y certificado de referencia sin copiar ni compilar.
.\build-android-qa.ps1 -ValidateOnly -ReferenceApk 'C:\backups\FinancePersonal-instalado.apk'

# Otra unidad, manteniendo una carpeta física corta y exclusiva.
.\build-android-qa.ps1 -BuildRoot 'D:\fp' -Architectures arm64-v8a
```

`-ReferenceApk` permite comparar certificado, paquete, versión y hash con una copia local del APK instalado. El script no usa ADB ni accede al teléfono: no instala, desinstala, limpia datos ni transfiere archivos. La instalación manual posterior debe hacerse como actualización; no desinstalar la aplicación existente.

## Por qué evita el error de Ninja

El build anterior exitoso usaba el init script local `short-native-paths.gradle`, con staging CMake corto, `CMAKE_OBJECT_PATH_MAX=240` y pools de compilación limitados. Un intento anterior que solo acortaba parcialmente la ruta (`...\finance-personal\m`) todavía fallaba en Ninja. Los archivos de CMake contienen rutas absolutas, por lo que copiar sus cachés o usar un alias de unidad no garantiza resolver el problema.

La solución repetible combina:

1. Copia física del código JS/TS, recursos, configuración Android y módulos nativos actuales a `C:\fp`. No usa `SUBST`, junctions ni symlinks para el proyecto o las dependencias nativas.
2. Instalación con `npm ci` dentro de esa copia. Se reutiliza cuando coinciden lockfile y versión de Node; no copia los `.cxx` ni los binarios del `node_modules` original.
3. Init script versionado `scripts/android-qa-short-paths.gradle`: staging en `C:\fp\.tmp\cxx`, límite de rutas de objetos y pools de CMake. Gradle ejecuta dos workers y no paraleliza proyectos.
4. Eliminación de los outputs de la aplicación y del Android generado **solo dentro de la copia administrada** antes de compilar. No se ejecuta `gradlew clean` sobre rutas CMake antiguas.

Una carpeta de compilación no vacía necesita el marcador de este script y debe pertenecer al mismo origen; de lo contrario se detiene sin borrar nada. `robocopy /MIR` solo sincroniza esa carpeta exclusiva. Nunca apunta al proyecto original. Se excluyen dependencias, cachés, outputs, `.env` y archivos de otros APK de la copia de fuentes.

## Comprobaciones antes de publicar el APK

- La copia de fuentes tiene el mismo manifiesto SHA-256 que el origen; si el código cambia durante el build, se detiene y se debe repetir.
- Gradle debe finalizar correctamente y producir un APK con fecha posterior al comienzo del proceso.
- `apksigner` verifica la firma y el certificado esperado; `aapt2` verifica paquete, versión y Release no depurable.
- Verifica bibliotecas nativas de las arquitecturas solicitadas, captura por notificaciones, widget y atajos.
- Verifica el bundle autónomo, la URL de la API y marcadores de la renovación: accesos configurables, perfil, iconos y detalle global de reportes.
- Un identificador nuevo y el hash de fuentes se incrustan en `assets/finance-build.json`; se vuelven a leer desde el APK final. El hash debe diferir del APK de referencia.
- Solo después copia el resultado al directorio de entrega y comprueba de nuevo su SHA-256.

Los APK, logs e informes locales están excluidos de Git. La huella de fuentes del informe permite identificar exactamente el código compilado aunque haya cambios locales sin commit.
