# Renovación de experiencia de Finance Personal

## Auditoría y propuesta antes de implementar

Base: commit `e09801f`, árbol limpio y 771 pruebas móviles previamente aprobadas. Se inspeccionaron las rutas, los componentes compartidos, los módulos de dashboard, reportes, categorías, perfil y autenticación, junto con los recorridos QA existentes. La captura inicial del emulador confirma que alertas y accesos preceden al saldo y que las tarjetas de deuda y cuenta ocupan gran parte de la pantalla. La inspección de código no se presenta como una revisión táctil de cada estado de cada pantalla.

| Prioridad | Hallazgo comprobable                                                       | Impacto y frecuencia                                                  | Decisión / esfuerzo                                                                      |
| --------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| P1        | Inicio presenta alertas, cuatro accesos y prioridad antes del saldo        | Retrasa la respuesta más frecuente: cuánto hay en cuentas             | Saldo primero, compromisos después; accesos compactos configurables. Medio               |
| P1        | Saludo usa `name` completo; `/me` solo permite lectura                     | Saludos extensos y ausencia de control sobre cómo llamar a la persona | Nombre mostrado explícito, sin dividir nombres antiguos. Medio                           |
| P1        | Dock emite tabPress, pero Screen no registra scroll al inicio              | Pulsar pestaña actual no tiene un efecto consistente                  | Coordinador compartido de scroll; conservar contexto al volver. Medio                    |
| P1        | Login/registro animan sin comprobar movimiento reducido                    | Barrera de accesibilidad al acceder                                   | Reutilizar entrada existente respetuosa de movimiento reducido. Bajo                     |
| P1        | Contraseña tiene un control de visibilidad sin área mínima propia          | Pulsación imprecisa en formularios de uso frecuente                   | Área táctil de 48 dp, estado accesible. Bajo                                             |
| P1        | Métricas en tres columnas con cifras de 13 y etiquetas de 10               | Reduce legibilidad y empeora con fuente aumentada                     | Filas/columnas adaptativas sin reducir artificialmente el texto. Medio                   |
| P2        | Catálogo de 16 iconos sin grupos ni búsqueda, duplicado en dos formularios | Encontrar una identidad resulta limitado y poco escalable             | Catálogo compartido, agrupado, buscable y con vista previa. Medio                        |
| P2        | Distribución circular es inicial incluso con muchos grupos                 | Comparación difícil con porciones pequeñas                            | Barras iniciales con más de cinco categorías; conservar opción circular. Bajo            |
| P2        | Perfil combina apariencia/privacidad y anida avisos en personalización     | Dificulta localizar ajustes                                           | Secciones explícitas por intención, sin eliminar opciones. Medio                         |
| P2        | Botones y tarjetas tienen radios/sombras y superficies de distinto peso    | Demasiados elementos compiten por atención                            | Tokens y catálogo reutilizable; reservar énfasis para acciones y cifras. Medio           |
| P2        | Personalización de Inicio solo cambia prioridad y orden fijo               | No permite elegir los módulos frecuentes                              | Selección persistida por usuario en el dispositivo, con recuperación ante errores. Medio |
| P3        | Reentrada anima múltiples bloques cada vez que se enfoca Inicio            | Movimiento repetido y trabajo sin valor informativo                   | Entrada discreta inicial, conservar estado en visitas posteriores. Bajo                  |

## Qué se conserva

- Formularios financieros con RHF/Zod, errores de servidor, control de doble envío, borradores y salida protegida.
- Cuentas/créditos separados; importes del servidor por moneda; ninguna suma COP/USD ni nuevo cálculo de saldo.
- Categorías padre/hija y su creación rápida, presupuestos con techo global, metas con historial, crédito y amortización.
- Menú con Reportes/Presupuestos visibles; cinco destinos inferiores y acción central Nuevo.
- Curvas/barras ya interactivas, paleta diferencial, correcciones de hit testing, detalle y enlaces a movimientos.
- Captura pendiente de confirmación, widget, atajos Android, App Intents iOS, sesiones y decisiones de permisos.
- Tema sin claves que desmonten formularios; feedback y confirmaciones existentes.

Las pantallas que ya resuelven bien su función se mantienen:

| Pantalla o flujo                         | Motivo para conservar su composición                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Registrar ingreso, gasto y transferencia | Campos financieros explícitos, cuenta/moneda, validación y salida protegida; adoptan los controles y tokens comunes.                    |
| Detalle de cuenta e historial            | Mantienen juntos saldo, cuenta y movimientos con filtros; no conviene sustituir esa relación por una cifra agregada ambigua.            |
| Crédito y amortización                   | Diferencian capital, cuotas y pagos; no se fusionan con dinero disponible ni con gasto corriente.                                       |
| Presupuestos y metas                     | Ya exponen límites/avances y acciones concretas; se conserva la jerarquía de categorías y el techo padre sin duplicarlo.                |
| Captura y revisión de pendientes         | Confirmar antes de registrar explica la diferencia entre sugerencia y operación financiera; se conserva esa separación y la privacidad. |
| Recorrido y configuración inicial        | Los pasos y la opción de ocultar conservan control del usuario; solo baja el peso visual al completarse.                                |

## Dirección del sistema visual

Una familia Inter; escala de texto consistente y cifras tabulares. Fondos neutros con matiz turquesa, superficie elevada discreta, marca verde turquesa y semántica estable: ingreso/éxito verde, gasto rosado, deuda azul, aviso ámbar. El color no es el único indicador: acompañan texto, icono y estado. Campos y controles con contraste comprobado, foco visible y objetivos táctiles mínimos de 48 dp. Sombras limitadas a superposición y navegación; tarjetas de contenido más tranquilas.

Primero se construye un catálogo de componentes en una ruta interna de desarrollo; después se aplica por módulos. No se cambia la identidad gráfica ni se añaden avatares. La inicial de la persona sigue siendo texto, no una nueva funcionalidad de avatar.

Inicio responderá en este orden: saldo registrado por moneda, acciones/compromisos por atender, accesos elegidos, actividad y presupuesto del mes, avances y cuentas. El saldo no se denomina patrimonio ni dinero libre después de obligaciones. Las deudas conservan su importe separado y una presentación secundaria compacta. La guía inicial pierde protagonismo al completarse o al ocultarla.

## Investigación de dependencias

Consulta de fuentes primarias el 1/11/2026; comparar con las versiones instaladas, no actualizar por popularidad. Los tamaños finales de APK requieren medición de un build; no se atribuyen cifras de ahorro no medidas.

| Candidata                        | Estado / compatibilidad y licencia                                                             | Coste y decisión                                                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reanimated 4.7.1 + Worklets 0.13 | Ya instalados; New Architecture, pareja compatible con RN 0.88; MIT                            | Reutilizar en dock/gráficos/modales. Sin nueva dependencia ni recompilación por instalar                                                          |
| expo-font ~58.0.11 + Inter       | Ya instalados; SDK 58, Android/iOS/web; MIT/OFL de la fuente                                   | Una familia y tres pesos existentes. Mantener carga actual probada                                                                                |
| lucide-react-native              | Componentes SVG con imports individuales; ISC; requiere react-native-svg                       | Buena alternativa, pero migrar claves persistidas y toda la app no demuestra beneficio frente a ampliar Ionicons. No instalar                     |
| expo-symbols ~58.0.4             | Ya instalado; usa SF Symbols en Apple y Material Symbols en Android/web; paquete MIT           | Conservar compatibilidad existente. No mezclar otra familia en categorías                                                                         |
| react-native-svg 15.16.0         | Instalado y recomendado para SDK 58; MIT                                                       | Mantener barras/distribución y etiquetas accesibles externas al SVG                                                                               |
| Victory Native                   | React 19/RN 0.79+ New Architecture; requiere Skia, Reanimated, Worklets y Gesture Handler; MIT | Añade motor nativo y recompilación. No hay necesidad demostrada para los datos mensuales actuales; no incorporar sin prototipo aislado y medición |
| Gifted Charts 1.4.81             | Instalado, MIT; líneas interactivas existentes sobre SVG                                       | Conservar y mejorar presentación/acceso textual; no reemplazar curvas estables                                                                    |
| expo-haptics                     | SDK 58; MIT, requiere integración nativa y añade VIBRATE en Android                            | Posible selección/confirmación futura; no añadir permiso ni recompilar solo por vibración. La respuesta visual ya cubre estas acciones            |

Fuentes: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [Reanimated 4.7](https://swmansion.com/changelog/reanimated-4-7-0/), [Expo Font](https://docs.expo.dev/versions/v58.0.0/sdk/font/), [Lucide Native](https://lucide.dev/guide/react-native), [Expo Symbols](https://docs.expo.dev/versions/v58.0.0/sdk/symbols/), [SVG](https://docs.expo.dev/versions/v58.0.0/sdk/svg/), [Victory](https://nearform.com/open-source/victory-native/docs/getting-started), [Gifted Charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts), [Haptics](https://docs.expo.dev/versions/v58.0.0/sdk/haptics/), [comportamiento de scroll nativo](https://reactnavigation.org/docs/use-scroll-to-top/).

## Decisiones de arquitectura

- No introducir otro navegador ni desmontar pantallas para resolver scroll. Al montar empiezan arriba; al regresar conservan estado; retocar la pestaña actual lleva arriba; cambios explícitos de período/filtros reinician el nuevo resultado. Los formularios no usan esa clave.
- Consolidar iconos Ionicons: claves antiguas permanecen válidas y los desconocidos conservan su respaldo. Guardado por el contrato de categorías actual, sin permisos de imágenes.
- Perfil necesitó un contrato aditivo: campos opcionales `firstName`, `lastName`, `displayName`, mantener `name` histórico y ampliar `/me` con actualización propia. V28 añade tres columnas nullable, sin reasignar usuarios, transacciones ni categorías. Los clientes de registro antiguos siguen enviando `name`. No inferir apellidos dividiendo espacios. Sin cambios del ledger.
- La validación encontró otro bloqueo concreto: el detalle global de ingresos abría la consulta histórica de gastos. Se añadió `GET /reports/transactions` con tipo, período, moneda y paginación; reutiliza `TransactionService` y sus filtros contables de reportes, sin cambiar sus reglas ni resultados. Los endpoints de gasto y categorías siguen compatibles. Una reversión de ingreso se presenta como reducción, y la de gasto como devolución.
- Fecha de nacimiento y ciudad se posponen: no aportan una función actual que justifique recopilar más información personal. Nunca bloquean registro.
- IA/chat/WhatsApp/Google/Apple/fotos quedan como posibilidades documentadas: la estructura de módulos permite añadir destinos, sin crear botones o pestañas vacías ahora.

## Validación incremental

Resultado al cerrar implementación:

- **794 pruebas móviles en 99 archivos**, frente a las 771 iniciales. Incluyen contraste de tokens, scroll, personalización por usuario, nombres explícitos, edición con error/cambio de usuario, catálogo y destinos de gráficos. Las 170 pruebas de aplicación del backend pasan; además se repitieron las dos de OpenAPI tras ampliar su aserción. Las clases `PostgreSql*` que crean bases temporales se excluyeron; no se presentan como ejecutadas.
- TypeScript, ESLint y formato de los archivos modificados correctos. OpenAPI regenerado desde el backend activo. Exportación de producción Android, iOS y web completada, sin agregar dependencias. No se generó ni instaló un APK nuevo; no se desinstaló, restableció ni borró información de ningún teléfono.
- V28 ejecutada mediante Flyway contra la PostgreSQL local existente después de un respaldo. Cambios de perfil y estilo se verificaron y se restauraron sus valores de prueba. No se modificaron transacciones, presupuestos, importes ni relaciones históricas.
- Ocho reconciliaciones de detalle contra reporte, en octubre/noviembre de 2026, COP/USD e ingreso/gasto. Octubre COP conserva ingresos de 2.004.510 y gastos de 590.098; USD conserva gasto de 25. Noviembre COP conserva ajustes de ingreso -10 y gasto -7. Los detalles incluyen las reversiones que explican esos signos; no inventan flujos positivos.
- Android: Inicio claro/oscuro, sistema, fuente al 140 % y 200 %, perfil persistido con nombre mostrado temporal, contenido sin guardar conservado al cambiar el tema del sistema, salida protegida, búsqueda de icono `cafe`, selección/guardado y restauración de estilo, acceso a ingresos reales desde el gráfico y regreso a la misma posición del reporte. Los accesos elegidos persistieron al recargar JavaScript; se restauró la selección anterior.
- TalkBack activado temporalmente en el emulador: controles de perfil y selección de tema expusieron sus etiquetas y estados. Se restauró desactivado, junto con la fuente y animaciones originales. Esta revisión del árbol accesible no sustituye una evaluación auditiva de todos los recorridos.
- Autenticación Android: cierre de sesión con confirmación, error por credenciales inválidas conservando el correo y los campos, acceso al registro y campos de nombre opcionales que conservan su valor al cerrar y volver a desplegar. No se crearon cuentas adicionales para esta inspección visual.

La evidencia local queda en `.tmp/full-qa-20261031/ux-*.png` y XML; las reconciliaciones en `.tmp/ux-report-live-reconciliation.json`, y los resultados en `.tmp/ux-final-mobile.log` y `target/ux-final-backend.log` del backend. Son artefactos locales ignorados por Git, no datos de producción. El engranaje flotante de las capturas pertenece a Expo Dev Client.

## Cobertura por módulo y límites

Inicio, navegación, reportes, perfil, autenticación y categorías reciben cambios de composición explícitos. Cuentas, créditos/amortización, ingresos/gastos/transferencias, presupuestos, metas, recurrentes, historial, captura y bandeja, onboarding y recorrido conservan sus flujos probados y adoptan los tokens/primitivas compartidos. No se sustituyen esos módulos ni se añaden animaciones a cada tarjeta. Se conservan botones de confirmación, errores y borradores.

El catálogo interno `/(app)/component-catalog` muestra tipografía, cifras, semántica, controles, formularios, carga/error/vacío/éxito y un prototipo de barras con datos claramente ilustrativos. Solo está disponible en desarrollo; no crea operaciones ni agrega un destino permanente a la navegación.

La comprobación visual Android es una muestra de recorridos y tamaños, no una afirmación de haber ejercitado manualmente todas las combinaciones posibles. No se midió un benchmark de rendimiento de producción. Con cambio de fuente en caliente, el cliente de desarrollo de Expo mostró una advertencia de contenedores duplicados y dejó de aceptar navegación imperativa; el arranque limpio con la misma fuente funcionó. Se documenta como limitación del recorrido de desarrollo, sin ocultar ni suprimir la advertencia en código.

La exportación JavaScript iOS no equivale a compilar con Xcode ni a validar VoiceOver. Faltan la evaluación auditiva completa de TalkBack/VoiceOver y la medición física de fluidez en una compilación de producción. Se conserva la orientación vertical existente; no se afirma soporte horizontal nuevo. Las ampliaciones futuras quedan documentadas sin pantallas vacías, permisos nuevos ni módulos de IA añadidos.
