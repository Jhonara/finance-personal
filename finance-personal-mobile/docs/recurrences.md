# Ingresos y gastos fijos

Acceso: **Cuentas → Ingresos y gastos fijos**, también desde Plan.

## Uso

- Salario: elige la cuenta que recibe el dinero y el importe **de cada pago**. Para un salario de 3.000.000 en dos pagos iguales, programa 1.500.000 dos veces al mes.
- Frecuencias: semanal (7 días), cada 14 días, dos días del mes o mensual. Dos veces al mes y cada 14 días son opciones distintas.
- Para días 29, 30 o 31 en meses cortos se usa el último día disponible; el mes siguiente recupera el día elegido. No se adelantan fechas por fines de semana.
- Automático: registra el importe al llegar la fecha, según la zona horaria guardada. No conecta con el banco ni realiza transferencias.
- Con confirmación: queda pendiente hasta indicar el importe y fecha reales. Recomendado para servicios cuyo valor cambia.
- Los pagos previstos y pendientes no modifican saldos, presupuestos ni reportes. Solo los registrados generan movimientos.
- Si un pendiente ya se anotó por otra vía, se puede omitir sin alterar saldos. Un registro automático ya contabilizado se corrige desde Movimientos.
- Las cuotas de créditos se consultan en la misma agenda, pero usan el formulario del crédito para actualizar su deuda. No deben crearse además como gasto fijo. Esta entrega no automatiza pagos de créditos.
- Editar afecta próximos pagos; los pendientes conservan el importe y cuenta originales. Pausar detiene próximas fechas. Reanudar no crea movimientos del período pausado.
- Alertas muestra los registros pendientes de confirmar y permite abrir la agenda.

## Ejecución y consistencia

El servidor procesa cada minuto; debe estar ejecutándose. No depende de que la app esté abierta. Al reiniciar recupera las fechas vencidas de las reglas activas con su fecha original, con un máximo de 120 por regla y ciclo. Una fecha de fin es inclusiva. No se permite crear una programación que empiece en el pasado.

La migración V17 añade reglas y ocurrencias. Todas las contabilizaciones pasan por LedgerService: se conserva la moneda de la cuenta y no se calculan saldos en el teléfono. Los gastos se clasifican como fijos. Los reportes usan la fecha efectiva del movimiento; una confirmación tardía queda en el mes en que ocurrió.

La combinación regla/fecha es única. El bloqueo de la regla serializa ejecución, confirmación y edición. Crear usa una clave estable para reintentos; editar usa versión para detectar cambios simultáneos. Los movimientos revertidos no se generan otra vez.

Si falta saldo registrado para un gasto automático, o la cuenta/categoría está inactiva, la ocurrencia queda pendiente con explicación. No se fuerza el movimiento ni se repite automáticamente un gasto fallido; se confirma u omite desde la agenda. Los errores técnicos inesperados se reintentan en el próximo ciclo mediante la transacción del servidor.

Configuración del servidor: `finance.recurrences.enabled` (por defecto true) y `finance.recurrences.interval-ms` (por defecto 60000). Las pruebas desactivan el programador y usan un reloj controlado y una base aislada.

## Validación de esta entrega

- Pruebas del calendario y de integración: zona horaria, meses cortos, fechas futuras, reportes, cuentas inactivas, falta de saldo, pausas, fin de programación, recuperación de fechas, edición, reversión, permisos, versión y confirmaciones concurrentes.
- Pruebas de pantalla: futuro sin confirmación, espera automática, importe real, doble toque, errores sin pérdida del formulario, privacidad y navegación de créditos/alertas.
- Suite móvil: 447 pruebas aprobadas. Servidor focalizado: 19 pruebas aprobadas entre recurrencias, reportes y contrato OpenAPI.
- La suite histórica ampliada tiene fallos en BudgetIntegrationTests asociados a fechas fijas de agosto frente a reversiones con la fecha actual; al compartir base, su limpieza también afecta LedgerLegacyAdapterIntegrationTests. No se modificaron esos escenarios en esta entrega. Los tests de PostgreSQL con contenedor se omiten sin Docker.

La validación visual usa la cuenta ya abierta y formularios sin guardar; no añade salarios ni gastos ficticios a los datos del usuario.

Se comprobó el acceso desde Cuentas, la agenda conectada y el formulario en modo oscuro después de recargar Expo. Se corrigieron márgenes internos, anchos de botones, jerarquía del calendario y textos del registro automático. El emulador seguía mostrando una versión anterior antes de esa recarga.

Durante la revisión del 21 de octubre de 2026, el reloj del emulador estaba en el 20 de octubre (GMT), mientras el servidor estaba en el 21 (America/Bogota). No se alteró el reloj del dispositivo. Para las pruebas de vencimientos conviene sincronizar fecha y zona horaria; de lo contrario, el servidor puede rechazar como pasada una fecha que el teléfono considera hoy.
