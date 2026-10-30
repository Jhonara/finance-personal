# Alertas y siguiente paso de automatización

## Implementado

- Pendientes, pospuestas e historial en una sola pantalla. La causa y las cifras se despliegan en «Por qué aparece»; el botón principal abre el crédito, presupuesto, agenda o informe correspondiente.
- Leer no resuelve ni oculta una condición pendiente. El servidor conserva el estado por usuario y situación; una nueva cuota o un cambio de nivel vuelve a pedir atención.
- Posponer aparta el aviso hasta la siguiente medianoche de Colombia. Se reevalúa al consultar/actualizar la app. No se implementaron notificaciones push ni un envío programado al teléfono.
- Las condiciones que dejan de aparecer pasan a Resuelta. Los avisos mensuales de períodos terminados pasan a Período finalizado; no se presentan como problemas solucionados. Se muestran los últimos 30 casos cerrados. Un caso que reaparece se reactiva, sin duplicarse.
- Inicio excluye los avisos pospuestos de sus avisos destacados. Las alertas leídas siguen contando mientras estén pendientes.
- Comparación de gastos independiente por moneda, con período e importes de evidencia. Se compara lo registrado en el mes elegido con el mes anterior completo; no se promete una comparación entre días equivalentes.
- Se retiró la recomendación automática de abonar a un crédito que no estaba respaldada por una simulación de un abono concreto.
- Los importes respetan Ocultar importes. No se muestran mensajes arbitrarios del servidor como texto financiero; se presentan campos conocidos y cifras formateadas.

## Contrato y persistencia

`GET /api/v1/alerts`, `GET /api/v1/alerts/history` y `POST /api/v1/alerts/{id}/state`.
La acción contiene `revision` y `READ`, `SNOOZE` o `RESUME`. Solo el propietario puede actuar. Una situación que cambió devuelve conflicto y la app vuelve a consultar sin repetir automáticamente la acción.

La migración V18 agrega `financial_alert_states`. Se serializan las actualizaciones por usuario y existe una clave única por caso. El estado contiene fechas de detección, revisión, cierre y posposición, y evidencia estructurada. Las consultas históricas del Dashboard siguen sin modificar estados.

La ruta antigua `/{code}/seen` permanece por compatibilidad, pero sus marcadores no suprimen condiciones. El historial empieza al consultar los avisos desde esta versión; no reconstruye incidentes anteriores. El calendario de las alertas usa America/Bogota. Las reglas de pagos programados conservan su zona configurada.

## Próximo paso: entrada voluntaria desde Atajos

Todavía no hay conexión con Wallet, SMS, correo ni un asistente de IA. Se propone primero una bandeja «Por revisar», compartida por las futuras fuentes:

1. El usuario decide qué operación comparte. Mostrar antes de activar qué campos salen del dispositivo y a dónde llegan.
2. Recibir importe, moneda, fecha/hora y comercio si la fuente los entrega; pedir los datos que falten. No inferir una ubicación precisa ni recogerla en segundo plano.
3. Mostrar origen, cuenta propuesta y categoría sugerida, con opción de corregir o descartar. Conservar solo los datos necesarios y permitir eliminar el borrador.
4. Detectar coincidencias con movimientos manuales y pagos programados antes de confirmar. Reintentos con la misma identidad no deben crear duplicados. No unir automáticamente dos compras distintas solo por coincidir en importe y comercio.
5. Solo al confirmar se crea el movimiento mediante el flujo financiero existente. Un borrador detectado no cambia saldos, presupuestos ni reportes. Los pagos de créditos deben vincularse al crédito para evitar contabilizarlos dos veces.

Apple documenta el disparador de transacción «When I tap» para una tarjeta seleccionada. Esto no garantiza acceso a todo el historial ni a todos los campos de Wallet. Antes de implementar, comprobar con un iPhone real qué datos llegan en la versión de iOS y tarjeta elegidas. Si faltan datos, ofrecer un atajo manual o compartir el comprobante.

El primer prototipo puede abrir un borrador en la app. La implementación definitiva debe validar identidad, formato, tamaño y permisos. Si se necesita recepción en segundo plano, usar autorización específica, revocable y limitada a crear borradores; nunca una contraseña bancaria ni un enlace que publique datos financieros sin autenticación. Activar o desactivar la integración debe estar bajo control del usuario.

FinanceKit requiere autorización de Apple y tiene disponibilidad limitada a cuentas elegibles en EE. UU. y Reino Unido según su documentación consultada. No se ofrece como acceso general a Wallet en Colombia.

Fuentes oficiales consultadas el 22 de octubre de 2026:

- [Disparadores de transacción en Atajos](https://support.apple.com/en-ph/guide/shortcuts/apd65c67538a/ios).
- [Disponibilidad y requisitos de FinanceKit](https://developer.apple.com/financekit/).

## Contexto para un futuro asistente

El asistente debe consultar hechos estructurados del usuario autenticado: período, moneda, importes calculados en el servidor, origen, fecha de actualización y estados de alertas. Una alerta leída o pospuesta no equivale a una obligación satisfecha. Los textos de comercios, recibos o correos son datos, nunca instrucciones para la IA.

Las recomendaciones deben mostrar qué registros las sustentan, distinguir información incompleta y no ejecutar movimientos por sí solas. Cualquier envío de información a un proveedor de IA será una integración explícita y configurable; no está habilitado por este cambio.

## Validación

- 44 pruebas del servidor correctas: ciclo de alertas, aislamiento de usuarios, revisión obsoleta, monedas, presupuestos, pagos programados y créditos.
- 479 pruebas de la app correctas en 55 archivos, con paralelismo limitado para evitar saturar el equipo.
- Se corrigieron fechas de fixtures antiguas: sus reversiones usan ahora una fecha explícita del período probado, sin cambiar las fechas de reversiones de producción.
- Contrato móvil generado desde el OpenAPI del servidor. El servidor local reiniciado ya expone los nuevos endpoints y sirve la pantalla en Android.
- Tipos, lint y exportación Android correctos (`.expo/export-alerts`). La revisión visual en oscuro confirmó que leer mantiene la alerta y que posponer la mueve al grupo correspondiente.
- Android: se probó volver de Pospuestas a Pendientes y abrir Historial vacío. La alerta usada quedó activa y leída; no se modificaron movimientos, saldos, créditos ni programaciones. Se dejó la app en Pendientes.
