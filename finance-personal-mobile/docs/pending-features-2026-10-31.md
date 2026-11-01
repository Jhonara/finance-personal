# Funcionalidades pendientes y auditoría — 31 de octubre de 2026

## Fase 0: conservación del trabajo

Se auditó el estado inicial de Git: 188 archivos modificados, 511 eliminados y 43 entradas nuevas. Las 505 eliminaciones bajo `m/` pertenecen a una copia del proyecto móvil, no a su ubicación principal `finance-personal-mobile/`. Todos tienen equivalente existente; 495 eran idénticos en HEAD. Las diez diferencias restantes son siete archivos generados y tres pruebas/documentos cuyas versiones principales son más recientes. No hay referencias activas a `m/` en configuración o plugins.

Los seis archivos Swift de App Intents, siete recursos de marca y dos archivos de VS Code principales se conservan idénticos. Expo mantiene sus plugins de App Intents, accesos rápidos, widget, notificaciones, OCR y recepción de documentos. Android tiene los módulos nativos existentes; iOS conserva sus intents y sus alternativas por plataforma. Esta auditoría de código no acredita compilación con Xcode en Windows.

No se restauró la copia duplicada. No hubo eliminaciones accidentales de código que restaurar. Se conservaron los cambios válidos de categorías, presupuestos, reportes y QA. Los 267 archivos de compilación del widget y 48 archivos de exports de validación se retiraron exclusivamente del índice de Git y permanecen en disco. Se ignoran exports de validación, cachés nativas, registros locales y respaldos temporales. Las seis eliminaciones adicionales son registros de compilación locales. El commit de limpieza verificada es `9f12941`.

Respaldo local, excluido de Git: `.tmp/pending-features/pre-phase0.patch`, `source-before-phase0.zip`, inventario inicial y comparación por archivo. No se usaron reset, clean ni borrados recursivos del espacio de trabajo.

## Fases 1 a 3: administración financiera

El detalle del historial permite revertir gastos, ingresos y transferencias elegibles. Presenta confirmación, motivo opcional, estado y enlaces entre original y reverso. Evita el doble envío y actualiza cuentas, reportes, presupuestos y bandeja. Los pagos de crédito conservan su flujo específico para mantener la deuda consistente. No se borran movimientos contabilizados.

Las metas permiten editar nombre, descripción, objetivo y fecha; consultar aportes y retiros; retirar hasta el acumulado; cerrar, cancelar y reabrir. Solo se ofrece eliminar cuando no existe historial y el acumulado es cero. Una meta completamente retirada conserva su historial. Inicio muestra las activas; la administración permite consultar las archivadas.

Se mantiene la semántica anterior de ahorro: los aportes y retiros son anotaciones del dinero ya apartado por el usuario. No modifican cuentas ni generan ingresos o gastos. La pantalla lo explica expresamente. No se transformaron aportes históricos en movimientos bancarios arbitrarios.

Los presupuestos se desactivan y reactivan con confirmación y control de versión. La categoría, los gastos y el límite anterior permanecen disponibles. Se conserva la selección padre/subcategoría, las vistas Resumen/Detalle y el techo general: cuando hay límite padre activo se usa este; en caso contrario se suman los hijos activos. No se suman ambos. Los gastos sin cobertura siguen visibles como Sin presupuesto.

Las migraciones aditivas V25, V26 y V27 están aplicadas en la base local existente `finance_personal`. No se crearon nuevas bases PostgreSQL. El respaldo y la conciliación se conservan fuera de Git. Los contratos, reglas de períodos, propiedad, concurrencia y compatibilidad están en [la documentación del backend](../../Servidor/Core/finance-manager-backend/docs/pending-features-2026-10-31.md).

## Fase 4: integraciones y accesibilidad

Se conservaron widget, accesos rápidos, captura de notificaciones, preferencias y permisos. Se corrigieron dos errores reproducidos con pruebas: un aviso podía terminar su carga después de cambiar o cerrar sesión; y abrir un aviso no respetaba un formulario con cambios sin guardar. Ahora se verifica la sesión antes de navegar y se utiliza la protección de salida del formulario.

Los campos de texto toman su etiqueta visible como etiqueta de accesibilidad por defecto. Se verificó el acceso rápido de gasto en el emulador. TalkBack se habilitó temporalmente, se comprobó su servicio y la estructura accesible, y se restauró la configuración original. Esto no equivale a una revisión auditiva completa de todas las pantallas.

## Fase 5: lectura de comprobantes

Se reutiliza ML Kit y el procesamiento local existente de imágenes/PDF. La selección entre lectura original y de contraste ahora tiene en cuenta la recuperación del total y la fecha. El intérprete distingue total pagadero de impuestos, cambio, importe entregado y número de artículos; tolera separadores con espacios, fechas con año primero y moneda COP explícita. Los vouchers anulados se señalan para revisión. CUFE/QR de factura no se confunde con códigos de seguridad bancarios.

Se conservan los límites de tamaño/páginas y el paso obligatorio de revisión. Leer un documento no contabiliza un gasto. El análisis de varias monedas contradictorias sigue pidiendo corrección.

## Fase 6: resultados del cierre — 1 de noviembre de 2026

| Verificación                                       | Resultado                                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Suite móvil completa                               | 92 archivos, 771 pruebas aprobadas                                                                                                   |
| Suite backend aislada H2                           | 163 pruebas, cero fallos o errores                                                                                                   |
| Java/Kotlin OCR productivo                         | 8 pruebas aprobadas: 5 de disposición y 3 de calidad                                                                                 |
| Contratos API locales de reversión/ahorro          | 38 comprobaciones aprobadas                                                                                                          |
| Presupuestos activos/inactivos y techo padre/hijos | 24 comprobaciones aprobadas                                                                                                          |
| Factura real previamente procesada por OCR nativo  | 4 comprobaciones aprobadas al reproducir la salida original/contraste como imagen/PDF                                                |
| TypeScript, ESLint y Prettier                      | Correctos                                                                                                                            |
| Export JavaScript iOS de producción                | Correcto; no es una compilación Xcode                                                                                                |
| Migraciones PostgreSQL V25–V27                     | Aplicadas correctamente                                                                                                              |
| Conciliación final de ledger y metas               | Cero originales revertidos sin corrección, cero asientos opuestos sin pareja y cero diferencias entre acumulado de metas e historial |

La suite automatizada excluyó las clases `PostgreSql*`, porque su infraestructura crea nuevas bases por clase. Se sustituyó esa comprobación en esta sesión por migraciones, pruebas API y concurrencia en la base existente. No se atribuye a H2 la validación del dialecto PostgreSQL.

El recorrido táctil del emulador verificó la reversión del gasto QA 91: confirmación, motivo, reverso 92 y navegación al original con estado Revertido. La consulta API confirmó los vínculos y el motivo. Se revirtió después su ingreso de financiación QA: las cuentas 26 y 27 quedaron en cero. También se comprobó visualmente la meta cerrada 8: conserva aporte de 80 COP y retiros de 50 y 30 COP, y no ofrece borrado. El presupuesto QA 20 se reactivó y volvió a desactivar con confirmación desde su pantalla; el estado y el límite se actualizaron correctamente. Los presupuestos QA 20 y 21 quedaron desactivados al terminar.

Los errores del script de automatización por pulsar coordenadas recortadas se corrigieron en el helper local; no se presentan como errores demostrados de la aplicación. Las animaciones del emulador quedaron restauradas a sus valores originales; también se verificó que TalkBack volvió a estar desactivado.

## Fase 7: entrega y límites

Los cambios verificados se separan por limpieza del repositorio, backend, móvil y documentación. El [manifiesto de archivos](../../docs/pending-files-2026-11-01.json) enumera altas, modificaciones y eliminaciones auditadas. Los commits no incorporan respaldos, compilaciones, contraseñas ni tokens.

### Entrega Android final

- Compilación Gradle Release completa: `BUILD SUCCESSFUL`, 1.052 tareas, sin errores de compilación. Permanecen advertencias de deprecaciones de herramientas para una futura actualización de Gradle.
- APK completo: `android/app/build/outputs/apk/release/app-release.apk`, 94.762.694 bytes, con JavaScript autónomo, OCR/PDF, notificaciones, widget y accesos rápidos; arquitecturas arm64 y x86_64.
- SHA-256: `F94A239F67CD9360F78E1EC4FBE3214231E13C9AAF29C255B752CBCF558A0806`.
- Firma verificada y compatible con la aplicación del Xiaomi: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- La comparación del manifiesto no encontró cambios de permisos respecto al APK anterior.
- API local física incluida: `http://192.168.1.55:8080/api/v1`. El backend se reinició con las correcciones verificadas y la misma base PostgreSQL.
- Se intentó una actualización conservando datos con `adb install -r`. Xiaomi/HyperOS la rechazó con `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`, mientras el teléfono estaba bloqueado. Se detuvieron los intentos; no se desinstaló, reinició de fábrica ni limpió la aplicación. El paquete anterior sigue presente, con fecha inicial 29/10/2026 y `ceDataInode=989265` conservados.
- Esta entrega es un APK compilado y verificado, **pendiente de instalación física**. No se presenta como una versión nueva instalada o probada en el Xiaomi. Las pruebas táctiles actuales se realizaron con el código servido al cliente de desarrollo del emulador, que conserva su firma y sus datos.

Commits funcionales: `3d08646` (backend), `37193b3` (móvil); la limpieza auditada está en `9f12941`. La documentación y el manifiesto se guardan en un commit separado.

Quedan para una pasada física dedicada la lectura auditiva completa con TalkBack, la colocación y uso continuo del widget, los avisos bancarios reales con permisos elegidos por el usuario y más fotografías difíciles/PDF escaneados. No se habilitaron permisos bancarios adicionales. Se conservan los cambios previos de temas claro/oscuro/sistema, gráficos y navegación, descritos en [el informe QA anterior](full-qa-2026-10-31.md). El rediseño visual general sigue separado de este cierre funcional.
