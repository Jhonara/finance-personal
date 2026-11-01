# Reportes y recorrido funcional — 31 de octubre de 2026

## Cambios

- Distribución circular con sectores reales, selección geométrica y categoría identificada por ID. Se conservan las porciones pequeñas; ya no se restan separadores que las hacen desaparecer.
- Paleta exclusiva de reportes: 16 colores adaptados al tema, ampliable sin repetir códigos de color. Los iconos conservan la personalización del usuario. La leyenda, el ranking y el gráfico utilizan el mismo mapa de series.
- Gastos e ingresos: distribución o ranking, resumen por padre y detalle por subcategoría. Un grupo con una sola categoría muestra su importe y su participación, evitando una torta completa sin información adicional.
- Presupuestos: cada indicador usa el límite de su propia subcategoría. Cursos: 120.000 / 200.000 = 60%; Universidad: 0 / 2.000.000 = 0%. Los excesos y límites cero conservan los importes del servidor.
- Historial: columnas comparativas o líneas interactivas de ingresos y gastos; selección accesible por mes, compartida entre ambos estilos. Los datos que no cargaron no se convierten en ceros ni se unen mediante una línea inventada.
- Privacidad: oculta importes, porcentajes y gráficas que podrían revelarlos. No cambia registros ni cálculos contables.

## Biblioteca y decisión

Se evaluaron [Gifted Charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) y [Victory Native](https://nearform.com/open-source/victory-native/docs/getting-started). Se incorporó `react-native-gifted-charts` 1.4.81 para las líneas interactivas: reutiliza SVG y Expo Linear Gradient ya instalados. Victory requiere incorporar Skia. Las distribuciones y comparaciones usan los componentes SVG existentes, con geometría e interacción verificables y sin cambiar el modelo financiero.

## Fallos encontrados y corregidos

| Prioridad | Problema reproducido                                                                                           | Corrección y comprobación                                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1        | Dos pulsaciones síncronas registraban dos gastos, ingresos o transferencias antes de actualizarse `isPending`. | Bloqueo inmediato por referencia en los tres formularios; se libera al fallar y permite reintentar. Pruebas antes de corregir: dos POST; después: uno. |
| P1        | Una porción abría otra categoría porque varios círculos SVG completos compartían el área de toque.             | Sectores disjuntos y selección por coordenadas e ID. Toque real sobre Educación abre Educación y Cursos muestra su movimiento de 120.000.              |
| P2        | El separador fijo borraba sectores pequeños y los colores personalizados podían repetirse.                     | Sectores proporcionales sin recorte fijo y paleta independiente compartida con la leyenda.                                                             |
| P2        | Cursos parecía casi vacío frente al presupuesto mucho mayor de Universidad.                                    | Escala individual e indicadores de utilización por subcategoría. Comprobado visualmente 60% y 0%.                                                      |
| P2        | Guardar un presupuesto podía dejar desactualizada la comparación presupuestaria.                               | Invalidación de consultas de reportes al crear o editar presupuestos.                                                                                  |
| P2        | Pagar o revertir créditos podía dejar reportes y presupuestos en caché.                                        | Invalidación conjunta después de estas operaciones.                                                                                                    |
| P2        | Mover o renombrar categorías podía conservar movimientos anteriores en un detalle ya abierto.                  | Invalidación de consultas de transacciones, incluyendo los grupos anterior y nuevo.                                                                    |
| P2        | Ampliar el historial podía cambiar silenciosamente el mes seleccionado al conservar su índice.                 | Selección por año y mes, con sustitución por el último disponible si desaparece del intervalo.                                                         |
| P3        | Un GET sobre el login, que requiere POST, devolvía 500.                                                        | Respuesta HTTP 405 con `METHOD_NOT_ALLOWED` y cabecera `Allow`, manteniendo el POST válido.                                                            |

## Validación

- Suite móvil final: **716 pruebas**, 86 archivos, sin fallos; TypeScript y ESLint aprobados.
- Backend final: **162 pruebas**, sin fallos, errores ni omisiones; `mvn package` aprobado con PostgreSQL aislado. Backend actualizado reiniciado en el puerto 8080 con la misma base `finance_personal`. GET del login comprobado en vivo: 405 y `Allow: POST`.
- Verificación API en datos ficticios aislados: gastos COP 601.500; ingresos COP 4.630.000; presupuesto 700.000; utilización del grupo Alimentación 80,3%; gastos USD 25 separados; ocho movimientos de Alimentación y cuatro de ingresos. Se preservan los ID históricos. Incluye compra y pago de deuda sin doble gasto, transferencia excluida y reverso con neto cero.
- Emulador: inicio, navegación, distribución de gastos, toque Educación → Cursos → movimiento 120.000, toque de la porción pequeña Comida → Comida por 10.000, comparación Cursos/Universidad, líneas y columnas, selección por mes, privacidad y ranking de ingresos. Vistas de cuentas, créditos y metas comprobadas. Contraste revisado visualmente en temas claro y oscuro; se restauraron el tema oscuro y los ajustes originales de animación. Capturas y árboles UI en `.tmp/category-hierarchy-20261030/reports-v3-*`.
- Recorrido de apertura: ingresos, gastos, transferencias, cuentas, movimientos, créditos, metas, presupuestos, categorías, recurrencias, bandeja, imagen, PDF, avisos bancarios y atajos. La apertura de una pantalla no equivale a probar todas sus operaciones.
- Las pruebas de borradores, cambio de usuario, captura, widget, atajos, reglas contables y relaciones históricas se incluyen en las suites. No se activaron permisos bancarios ni se registraron gastos de prueba en la base personal durante el recorrido.

## Observaciones para la siguiente revisión visual

| Prioridad | Observación                                                                                         | Alcance                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| P3        | Atajos y tarjetas muestra una explicación de iOS también en Android.                                | El texto puede separar mejor las tarjetas vinculadas de las automatizaciones de iPhone. No afecta los registros.     |
| P3        | El contador de categorías muestra “1 subcategorías”.                                                | Ajustar el singular en la revisión de textos.                                                                        |
| P3        | Al iniciar un desplazamiento vertical sobre una línea interactiva, puede cambiar el mes consultado. | Evaluar activación mediante pulsación prolongada. Los importes seleccionados siguen correspondiendo al mes indicado. |

## Límites de la prueba física

El Xiaomi permite lectura ADB, pero rechaza `adb input` con `INJECT_EVENTS`. Es una restricción de seguridad del sistema: impide automatizar el recorrido táctil físico. El recorrido táctil se realiza en el emulador; la instalación y el arranque físicos se verifican por separado. No se desinstala, restablece ni borra el almacenamiento de la aplicación.

## Instalación física comprobada

- Compilación Android completa: `assembleRelease` aprobado; APK autónomo con JavaScript incluido, arm64 y x86_64, captura por notificaciones, OCR/PDF, widget y accesos rápidos. No requiere Metro.
- Archivo: `android/app/build/outputs/apk/release/app-release.apk`, 94.827.110 bytes. SHA-256: `A05CCD6445CEE2E1CA915AD0C281210EBAB41FE6A4024DA8BABFE02A72DBE06F`.
- Firma comparada con la app del Xiaomi antes de instalar. Actualización con `adb install -r`: **Success**. `firstInstallTime` continúa en 29 de octubre y `ceDataInode` permanece en 989265; la aplicación no fue desinstalada ni sus datos borrados.
- Componentes de captura y widget comprobados en el paquete instalado. La API Wi-Fi `192.168.1.55:8080` fue alcanzada desde el propio Xiaomi, incluso después de reiniciar el backend.
- Inicio físico: `am start -W` con estado `ok`, proceso activo y registro `ReactNativeJS: Running "main"`, sin excepciones fatales en la muestra de arranque revisada. Después de que el usuario desbloqueó el Xiaomi, se verificaron visualmente Inicio y Reportes de gastos, con la sesión conservada y los datos cargados del backend. Reportes muestra las nuevas opciones Resumen/Detalle y Distribución/Ranking. Evidencia en `.tmp/android-delivery-20261031/xiaomi-unlocked-runtime.png`, `xiaomi-reports-runtime.xml` y `xiaomi-reports-runtime-visible.png`. La restricción de toques remotos continúa: no se presenta esta comprobación como un recorrido táctil físico completo.
- El emulador utiliza otra firma de desarrollo. Android rechazó sustituirla por el APK firmado para el Xiaomi; se conservaron sus datos y la validación táctil se realizó con el cliente de desarrollo y el código actual. No se desinstaló para forzar el reemplazo.
- Base personal: Flyway V23 y V24 comprobadas como exitosas. Este trabajo no requiere otra migración. Se apagó únicamente el clúster temporal de pruebas, conservando PostgreSQL personal y backend activos.
