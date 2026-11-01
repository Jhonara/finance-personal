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
- El único bloqueo de contrato comprobado es perfil. Añadir campos opcionales `firstName`, `lastName`, `displayName`, mantener `name` histórico y ampliar `/me` con actualización propia. Migración aditiva, sin reasignar usuarios, transacciones ni categorías. Los clientes de registro antiguos siguen enviando `name`. No inferir apellidos dividiendo espacios. Sin cambios del ledger.
- Fecha de nacimiento y ciudad se posponen: no aportan una función actual que justifique recopilar más información personal. Nunca bloquean registro.
- IA/chat/WhatsApp/Google/Apple/fotos quedan como posibilidades documentadas: la estructura de módulos permite añadir destinos, sin crear botones o pestañas vacías ahora.

## Validación incremental

Se registrarán pruebas nuevas, suite completa, TypeScript/lint, contraste, tamaños aumentados, recorrido Android y límites reales. No se genera APK durante la implementación. Una exportación JavaScript iOS no equivale a compilar con Xcode.
