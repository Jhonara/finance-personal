# QA funcional de planificación, categorías y captura — 31 de octubre de 2026

Se ejercitaron las API locales con la cuenta de pruebas autorizada. El respaldo general y el estado inicial se guardaron antes de comenzar. Todos los objetos de esta batería están identificados como `QA31_PLAN_20261031131121`; las categorías, movimientos y programaciones anteriores a la prueba no se modificaron.

## Cobertura ejecutada

La evidencia de ejecución está en `target/full-qa-20261031/planning/results.json`. La batería inicial completó **70 comprobaciones distintas**; las comprobaciones de las correcciones se ejecutan después de reiniciar el backend actualizado y se guardan aparte en `fixed-boundaries-after.json`.

- Categorías de gasto e ingreso: crear padre e hijo, duplicados normalizados entre hermanos, nombre idéntico en padres distintos, tercer nivel, autoparentesco, ciclos, tipos distintos, desactivación segura, reactivación y movimiento de una subcategoría.
- Historial: al mover una subcategoría se conserva su ID, su presupuesto y los movimientos; los reportes históricos pasan a utilizar el padre actual, como define la arquitectura.
- Presupuestos: crear y editar, versión obsoleta, duplicados, límites positivos, periodo inválido, categoría de ingreso rechazada, techo del padre, gasto directo e hijo, exceso, reversión y gasto sin presupuesto.
- Prueba concreta: techo padre de 1.000 y asignación hija de 700; gasto hijo de 800 y directo de 300. El grupo informa límite 1.000, gasto 1.100 y exceso 100, sin sumar el límite hijo de nuevo. Al revertir el gasto de 800, queda gasto 300 y disponible 700.
- Ingresos: registro en una subcategoría y total del padre sin convertirlo en presupuesto de gasto.
- Recurrencias: mensual, dos veces al mes, semanal y cada dos semanas; agenda pendiente, confirmación repetida, omisión, pausa, reanudación, cierre al último pago, zona horaria y fechas inválidas.
- Un total mensual de 4.000.000 produce dos pagos de 2.000.000 cuando la frecuencia es dos veces al mes. Semanal y cada dos semanas usan el promedio anual documentado: 12 meses / 52 o 26 pagos; el total efectivo de un mes depende de sus fechas. La API no multiplica nuevamente el importe mensual.
- Ahorro: aportes, progreso, cumplimiento, rechazo posterior al cumplimiento, moneda y conservación de totales del ledger. Los aportes informativos no crean otro gasto.
- Concurrencia: dos ediciones de presupuesto con la misma versión producen una aceptación y un conflicto; seis aportes simultáneos mantienen exactamente la suma de los aceptados, sin errores 500 ni aportes perdidos.
- Captura: reintento de imagen, conflicto por clave reutilizada con otros datos, confirmación idempotente, detección de un gasto existente desde PDF, vinculación sin duplicar, descarte, reintento tras descarte, paginación, atajo y recepción repetida de Wallet por referencia de evento.
- Wallet de crédito: conserva el tipo de tarjeta y rechaza registrarlo como salida de una cuenta de débito. El alias temporal de tarjeta y el borrador se eliminaron/descartaron después de esa prueba.
- Aislamiento: otro usuario no puede consultar categoría, presupuesto, borrador o meta ajenos, crear un hijo de un padre ajeno ni activar una programación ajena. Su sesión de prueba se revocó.

## Fallos reproducidos y corregidos

### Reanudar una programación que ya terminó en el día actual

Antes: crear una programación automática mensual cuyo inicio y fin fueran el día actual registraba un único pago y quedaba finalizada. Reanudarla ese mismo día respondía `ACTIVE` y volvía a señalar el día ya procesado hasta la siguiente pasada del trabajador. La restricción de ocurrencia impedía duplicar el dinero, pero el estado y la siguiente fecha eran incorrectos.

Corrección: al reanudar se avanza sobre las ocurrencias que ya tienen una instantánea, antes de validar la fecha final. Si no quedan fechas, se rechaza la reanudación. Una ocurrencia pendiente sigue disponible para confirmación y no se recrea.

Validación: `RecurrenceIntegrationTest`, 20 pruebas satisfactorias, incluidas tres nuevas para cierre en el mismo día, reanudación tras pago y conservación de una instantánea pendiente.

### Importes fuera de la precisión almacenada y nombres demasiado largos

Antes: un límite muy grande al crear un presupuesto respondía con un conflicto de duplicado engañoso; al editarlo, o al crear una meta con un importe demasiado grande o un nombre de 101 caracteres, respondía 500. La base rechazaba el dato y la transacción se revertía, pero faltaba validación comprensible antes de persistir.

Corrección: creación y edición de presupuestos, objetivo de ahorro y aporte de ahorro admiten hasta 15 enteros y 4 decimales, igual que `numeric(19,4)`. Los nombres de metas se limitan a los 100 caracteres de su columna. Los valores inválidos reciben 400 con el campo que debe corregirse.

Validación: `PlanningInputValidationTest`, seis pruebas satisfactorias para desborde, exceso de decimales, nombre y límites válidos existentes.

### Desborde del total de una meta al sumar un aporte válido

Antes: una meta con 4 acumulados más un aporte de `999999999999999.9999` recibía 500 porque la suma superaba el máximo almacenado, aunque el aporte individual cabía en la columna.

Corrección: se comprueba el total antes de cambiar la meta o guardar el movimiento. Se devuelve 400 y se conserva el acumulado anterior.

Validación: `SavingCurrencyTest`, dos pruebas satisfactorias; el nuevo caso verifica que el total no cambie y que no se guarde ningún movimiento ante el desborde.

## Evidencia y objetos creados

- Cuenta de QA: 16; apertura ficticia de 10.000.000 COP para ejecutar gastos y programaciones sin afectar cuentas anteriores.
- Categorías: 44–49; presupuestos: 18–19; metas: 6–7.
- Programaciones: 11–12 pausadas al terminar su recorrido; 13 finaliza con su último pago. Los estados se vuelven a comprobar después del reinicio.
- Borradores: 11 registrado, 12 vinculado y 13–15 descartados.
- La manifestación completa de IDs y los importes esperados están en `results.json`. No contiene contraseñas, JWT ni refresh tokens.

Los objetos ficticios se mantienen identificados para inspección posterior; no se eliminó ni restauró la base completa durante la prueba.

## Límites del resultado

Esta batería valida las reglas del servidor, no demuestra por sí sola la legibilidad de las pantallas, la cámara, la lectura OCR del dispositivo, el selector de PDF o el widget. Esas comprobaciones pertenecen al recorrido móvil general y deben distinguirse de esta evidencia API.

La API actual no ofrece borrar presupuestos ni editar, retirar aportes o borrar metas de ahorro. Son capacidades pendientes de diseño, no botones existentes que hayan fallado durante estas pruebas. No se añadieron operaciones financieras nuevas sin una regla de negocio definida.
