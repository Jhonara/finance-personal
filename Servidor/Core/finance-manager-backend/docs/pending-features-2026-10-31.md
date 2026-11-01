# Administración financiera y cierre de pendientes QA

## Migraciones y conservación

V25 añade el motivo opcional del reverso. V26 añade descripción, fecha objetivo y estado de metas, además de tipo e identificador opcional de petición en sus movimientos. V27 añade `active` a presupuestos. Son cambios aditivos: no reasignan categorías ni modifican importes, ID o asientos anteriores. Las metas y presupuestos existentes siguen activos; los aportes anteriores conservan el tipo CONTRIBUTION.

Se aplicaron en PostgreSQL local `finance_personal`, sin crear nuevas bases. Respaldo anterior: `.tmp/pending-features/before-pending-features.dump` en la raíz del repositorio, SHA-256 `8D4D0A53134FFBEB72C0A4675720643039F5DC0DE1FBAA35A8A23AE9EAD859DF`.

## Reversión del historial

`POST /api/v1/transactions/{id}/reversal`, cuerpo opcional `{ "reason": "Duplicado" }`, admite gastos, ingresos y transferencias propios POSTED. El motivo admite 255 caracteres. Devuelve el reverso y sus vínculos; el original pasa a REVERSED. El detalle y listado incluyen `reversible`, `reversalOfId`, `reversalId`, `originalType` y `reversalReason`.

Reutiliza LedgerService y su restricción única por original. Se bloquean el original y las cuentas en orden estable. Los escritores de caja usan el mismo bloqueo de cuentas. Si la corrección necesita retirar dinero ya gastado, devuelve 409 sin modificar asientos. Las transferencias conservan una fila lógica y muestran la ruta real de devolución. Ni apertura ni operaciones de crédito se revierten por este endpoint: los pagos de crédito conservan su flujo específico, que actualiza también la deuda.

La corrección se fecha hoy según la regla existente. El movimiento original permanece en su período histórico y el asiento opuesto afecta al período de corrección. Se conservan las consultas que consideran ambos, excluyendo VOIDED; no se excluye indiscriminadamente el original REVERSED. El endpoint DELETE de gastos anterior continúa utilizando el mismo ledger.

## Metas de ahorro

Se conserva expresamente su naturaleza informativa: anotan dinero que el usuario ya apartó. Aportar o retirar modifica el progreso y su historial, sin crear asientos bancarios, ingresos ni gastos. No se convierten aportes históricos en transferencias ni se les asignan cuentas arbitrariamente. Un producto futuro para mover fondos entre cuentas requeriría una decisión financiera separada.

| Operación | Endpoint |
| --- | --- |
| Crear/listar | POST/GET `/savings/goals` |
| Consultar/editar | GET/PUT `/savings/goals/{id}` |
| Historial | GET `/savings/goals/{id}/movements` |
| Aportar | POST `/savings/goals/{id}/movements` |
| Retirar | POST `/savings/goals/{id}/withdrawals` |
| Cerrar/cancelar/reabrir | PATCH `/savings/goals/{id}/status` |
| Eliminar solo vacía | DELETE `/savings/goals/{id}?version=…` |

La edición recibe nombre, descripción opcional, objetivo, fecha opcional y versión. El cambio de estado recibe ACTIVE, CLOSED o CANCELLED y versión. Cerrar o cancelar conserva todo el historial; se permiten retiros del ahorro ya anotado, pero no nuevos aportes hasta reabrir. El estado de cumplimiento se recalcula al editar o retirar. Inicio muestra solo metas activas; la administración conserva también las archivadas.

Los movimientos reciben importe positivo, fecha y versión; esta es obligatoria en retiros y opcional en el contrato antiguo de aportes para mantener compatibilidad. `requestId` opcional permite repetir la misma petición sin duplicarla; reutilizarlo con datos diferentes devuelve conflicto. La versión JPA se confirma antes de insertar el movimiento, dentro de la misma transacción. Un retiro nunca puede superar el acumulado. No se puede borrar una meta con historial, aunque su acumulado vuelva a cero. Las monedas antiguas sin definir mantienen su asignación explícita de una sola vez.

## Presupuestos

GET `/budgets` conserva su consulta activa por período y añade `includeInactive=true` para administración. GET por ID conserva el límite anterior incluso desactivado. DELETE `/budgets/{id}?version=…` desactiva; PATCH `/budgets/{id}/state` recibe `{ "active": true, "version": … }` para reactivar.

No se borran categorías, transacciones ni presupuestos. Se conserva la identidad única usuario/categoría/mes: se edita o reactiva el registro existente en lugar de crear otro duplicado. Desactivar un padre no desactiva los hijos. Los reportes usan únicamente límites activos: techo padre si existe, o suma de hijos activos, sin sumar ambos. Los gastos siguen completos; al quitar cobertura pueden aparecer como Sin presupuesto. Cambiar un límite o su estado recalcula la comparación del período, incluidos meses anteriores; el registro desactivado conserva su valor consultable y reactivable.

## Verificación

Pruebas automatizadas cubren propiedad, versiones, duplicados, saldo insuficiente, trayecto de transferencias, originales/reversos, historial de metas, retiro excesivo, archivo/reapertura, conservación del ledger y techos padre/hijo. Las pruebas funcionales locales verificaron dos retiros simultáneos: un 200, un 409 y un solo descuento.

Las suites PostgreSQL que crean una base nueva por clase no se ejecutaron en esta sesión por la restricción explícita del usuario. En su lugar se aplicaron las migraciones y se probaron los contratos y la concurrencia sobre recursos QA en la base existente. Los registros temporales y respaldos quedan fuera de Git.
