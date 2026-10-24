# Cinco mejoras de experiencia — 22 de octubre de 2026

## Implementado

1. **Salario mensual o importe por pago.** Los ingresos mensuales y de dos fechas al mes permiten elegir cómo expresar el importe. La vista previa del servidor muestra cuánto corresponde a cada pago, el total de un mes completo y las fechas e importes de los primeros dos meses. Las semanas y los períodos de 14 días usan el importe por pago, porque la cantidad de fechas cambia entre meses. El primer mes respeta la fecha de inicio y el último respeta la fecha de fin. La vista previa no registra movimientos. Una edición conserva el importe por pago existente: no se reinterpretó ni modificó el salario del usuario.
2. **Salir sin perder cambios por accidente.** La flecha, Atrás de Android y las salidas desde la barra de navegación consultan una protección común en los formularios financieros. Un formulario modificado ofrece «Seguir editando» o «Descartar». Un formulario intacto vuelve directamente; cerrar un selector o retroceder un paso del asistente de créditos no descarta los datos. Durante el envío se bloquea la salida. El cierre después de guardar sigue siendo directo.
3. **Historial que explica cada cifra.** El historial de ingresos y gastos fijos abre su movimiento exacto. Reportes abre los movimientos del gasto total o de una categoría, conservando mes y moneda. El servidor filtra antes de paginar e incluye las reversiones que corresponden al gasto del reporte. La comparación de categorías se conserva al abrir el historial. Los filtros generales de Movimientos no se alteran.
4. **Pausada y finalizada son estados diferentes.** Una programación finalizada explica su fecha de fin y ofrece cambiarla. Una programación pausada conserva la acción de reanudar. Extender la fecha de fin de una programación pausada no la activa por sí solo.
5. **Próximos siete días en Inicio.** Una tarjeta muestra como máximo tres ingresos o gastos fijos aún pendientes o previstos, con sus fechas y monedas. El servidor calcula la ventana de siete días, incluso al cambiar de mes. Si no hay eventos, la tarjeta desaparece. Cada fila abre la agenda en el mes correspondiente. La tarjeta es opcional desde Perfil y la preferencia se guarda por usuario. Los importes respetan el modo de ocultar cifras. Los pagos previstos siguen separados de saldos y reportes reales.

## Validación realizada

- App: **467 pruebas en 54 archivos**, todas correctas; comprobación de tipos y lint correctos.
- Servidor: **24 pruebas específicas**, todas correctas (`RecurrencePreviewTest`, `RecurrenceDatesTest`, `RecurrenceIntegrationTest`, `ReportServiceTest`). La integración usa H2 aislado; no se probaron escrituras sobre la base de datos del usuario.
- Exportación Android correcta en `.expo/five-improvements-export`.
- Contrato de la app regenerado a partir del OpenAPI producido por el servidor durante las pruebas.
- Casos cubiertos: salario mensual repartido; conservación de importe por pago existente; meses incompletos, febrero bisiesto y semanas variables; cancelación de salida; doble pulsación; error de guardado conservando datos; estados pausado/finalizado; consulta de movimientos restringida al propietario; filtro paginado con 26 operaciones y una reversión; monedas separadas; ventana de próximos pagos al cambiar de mes; privacidad y preferencia por usuario.

## Comprobación realizada en Android después del reinicio

El servidor local ya publica la vista previa, próximos pagos y movimientos de reportes. Se recorrió el emulador Pixel 10 con el tema oscuro:

1. Un formulario nuevo intacto vuelve con la flecha sin preguntar. Al cambiarlo, la flecha muestra la confirmación y «Seguir editando» conserva el borrador. Atrás de Android también muestra la confirmación; descartar el borrador de prueba vuelve a la agenda.
2. La vista previa de 3.000.000 mensuales con pagos el 15 y el último día mostró 1.500.000 por pago, 1.500.000 el 31 de octubre y 3.000.000 en noviembre (días 15 y 30), con inicio el 22 de octubre. No se guardó el ejemplo.
3. La edición del salario existente conservó 3.000.000 **por pago** y permitió salir sin advertir al no modificarlo. La lista se ajustó para mostrar también «por pago» junto al importe, evitando confundirlo con el total mensual. Este ajuste de texto pasó formato y tipos y se comprobó visualmente.
4. Reportes → Gastos → Ocio abrió octubre de 2026 en COP con sus tres gastos de 120.000, 1.000 y 10.000, que explican los 131.000 del reporte. Se abrió y cerró un detalle; al volver se conservaron la comparación de Ocio y la posición en el reporte.
5. Perfil muestra la preferencia de próximos pagos activada y no deja seleccionado Menú. Inicio no muestra la tarjeta: la siguiente fecha observada es el 31 de octubre, fuera de los próximos siete días desde el día 22.

Los estados pausado/finalizado, el historial de pagos fijos registrados, la paginación y una tarjeta con eventos siguen cubiertos por las pruebas automatizadas. No había ejemplos de esos estados en las pantallas recorridas y no se alteraron los datos del usuario para fabricarlos.

## Continuación de los ajustes visuales

Se implementaron las confirmaciones con el tema de la app, la simplificación del formulario de pagos fijos y la búsqueda de movimientos por concepto, categoría o cuenta. La comprobación y el reinicio pendiente del servidor para activar la búsqueda están detallados en [UX: búsqueda y formularios](ux-search-and-forms-2026-10-22.md).

No se modificaron cuentas, saldos, créditos ni programaciones reales para realizar estas comprobaciones.
