# Migración a Expo SDK 58

## Causas comunes y correcciones

La instalación inicial reproducía 500 errores de TypeScript y seis suites que no podían cargar. La mayor parte provenía de cambios compartidos, no de errores en los cálculos financieros.

- **Estilos:** React Native 0.88 ya no exporta `StyleSheet.NamedStyles`. Se sustituyó ese tipo en `themedStyleSheet` por un mapa de `ViewStyle | TextStyle | ImageStyle`, manteniendo `StyleSheet.create`, la inferencia de propiedades y la actualización de colores al cambiar de tema. Esta corrección redujo los errores a 15 sin reescribir las pantallas.
- **Referencias:** las referencias de componentes ahora usan `ScrollViewInstance` y `ViewInstance`. Se conservan el desplazamiento de amortización, la guía y el recorrido interactivo, también con el teclado abierto.
- **Tipos nulos:** el adaptador de alertas normaliza título y mensaje opcionales. Los iconos reciben el color mediante su estilo de texto, compatible con `ColorValue` de React Native 0.88.
- **Navegación:** la barra usa `emitter` y `navigateToTab(route.key)` de SDK 58. Conserva eventos, pulsación prolongada y protección de formularios sin guardar. Las pantallas internas usan `tabBarButton: () => null`: en esta versión `href: null` se convierte en `hidden` y puede redirigir al intentar abrir la ruta. El menú mantiene sus cinco posiciones.
- **Pruebas:** Vitest define `__DEV__` y el entorno de `act`. Solo se sustituye la barra de estado nativa por un componente de prueba, evitando iniciar el runtime de Expo dentro de Node. Las seis suites vuelven a ejecutar sus pruebas.
- **React:** React, React DOM y react-test-renderer quedan alineados en **19.3.0**, con `@types/react ~19.3.0`. El renderizador se mantiene como dependencia de desarrollo.
- **TypeScript y OpenAPI:** la app usa **6.0.3**. `openapi-typescript 7.13.0` declara un peer `^5.x`; se aisló en el workspace privado `tools/openapi`, con TypeScript **5.9.3**. La resolución efectiva de ambos compiladores se comprobó después de `npm ci`. No hay overrides de compatibilidad ni instalaciones con `--force` o `--legacy-peer-deps`.

No se modificó `tsconfig.json`, no se añadieron `any` ni `@ts-ignore` y no se eliminaron pruebas. Se actualizaron las comprobaciones de rutas al nuevo comportamiento y se añadieron seis pruebas de la barra de navegación. El backend y la lógica financiera no se modificaron durante esta migración; sus cambios anteriores en el árbol de trabajo se conservaron.

## Validación

| Comprobación                             | Resultado                                                            |
| ---------------------------------------- | -------------------------------------------------------------------- |
| Instalación desde el lockfile (`npm ci`) | Correcta                                                             |
| Árbol de dependencias (`npm ls --all`)   | Sin dependencias inválidas                                           |
| Expo Doctor                              | 20/20 comprobaciones                                                 |
| TypeScript                               | 0 errores                                                            |
| Vitest                                   | 527 pruebas, 59 archivos; todos pasan                                |
| ESLint                                   | Sin errores                                                          |
| Prettier                                 | Correcto                                                             |
| Generador OpenAPI aislado                | Correcto; el resultado formateado coincide con el contrato existente |

La exportación final `npx expo export --platform all --max-workers 2 --output-dir .expo/export-sdk58` terminó correctamente para **iOS, Android y web**, con código de salida 0.

Los logs locales están en `.expo/sdk58-*.log`; los resultados de exportación se guardan en `.expo/export-sdk58`. Esos archivos son de validación local y no se versionan. La generación de paquetes JavaScript no equivale a una compilación nativa firmada ni sustituye la prueba en un iPhone físico.

## Pendientes ajenos a los errores de migración

`npm audit` informa **12 avisos de seguridad**: 2 moderados, 9 altos y 1 crítico en el árbol de dependencias. Entre los paquetes señalados están herramientas de desarrollo y dependencias transitivas de Expo. Algunas sugerencias automáticas proponen cambiar Expo a SDK 54; no se aplicaron cambios forzados que contradigan la migración a SDK 58. El detalle local está en `.expo/sdk58-audit.json`. Esto requiere una revisión de actualizaciones por separado; los resultados de Doctor, TypeScript y Vitest no certifican la ausencia de vulnerabilidades.

El 24 de octubre el usuario confirmó que, tras reiniciar Expo y escanear el QR nuevo, la app abre en su **iPhone físico** y permite entrar a **Cuentas, Créditos y Reportes**. Esto valida la apertura y esas rutas; no equivale a haber repetido manualmente todos los formularios y operaciones financieras en el teléfono.

## Ejecutar en el iPhone

1. Usar Expo Go compatible con SDK 58.
2. Mantener el iPhone y el computador en la misma red; la API debe usar la dirección LAN del computador, no `10.0.2.2`.
3. Detener la sesión anterior de Expo y ejecutar `npx expo start --clear` desde `finance-personal-mobile`.
4. Escanear el nuevo QR y comprobar Cuentas, Créditos, Reportes y un formulario con calendario.

## Referencias

- [Expo SDK 58 y cambios de compatibilidad](https://expo.dev/changelog/sdk-58).
- [Migración de Expo Router de SDK 57 a 58](https://docs.expo.dev/router/migrate/sdk-57-to-58/).
- [Tipos estrictos y referencias de React Native](https://reactnative.dev/docs/strict-typescript-api).
- [Uso y requisitos de openapi-typescript](https://openapi-ts.dev/introduction).
