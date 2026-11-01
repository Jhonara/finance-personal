# Validación funcional de API — 31 de octubre de 2026

## Alcance y datos

Se usó exclusivamente la cuenta de pruebas autorizada `j@j.com` (ID 9), después del respaldo completo coordinado antes de la sesión. Las credenciales y los tokens no se guardan en este documento ni en los scripts. Los scripts reciben las credenciales mediante variables de entorno y revocan únicamente su propio refresh token al terminar; no cierran las sesiones del emulador o del teléfono.

Los objetos nuevos se identifican con `QA31_API 131236`. No se modificaron cuentas, transacciones ni créditos preexistentes de otros usuarios. No hubo limpieza masiva ni cambios de esquema.

La evidencia de ejecución, fuera de fuentes, está en `target/full-qa-20261031/`:

- `api-financial-qa.mjs` y `api-financial-state.json`: 79 comprobaciones iniciales aprobadas, más el cierre de la sesión propia.
- `api-edge-qa.mjs` y `api-edge-state.json`: reproducción de validaciones que devolvían 500.
- `credit-suite-after.log`, `input-suite-after.log`, `rounding-suite-after.log`: pruebas de regresión de los cambios.

## Recorrido funcional real

| Área | Casos ejercitados | Resultado inicial |
| --- | --- | --- |
| Autenticación | Acceso con cuenta de pruebas, `/me`, consulta sin token y cierre de sesión propia | Correcto |
| Cuentas | Alta COP/COP/USD, nombre duplicado, nombre corto, moneda inválida, edición con versión, archivar/reactivar | Correcto |
| Apertura | Aperturas de 1.000.000 COP, 200.000 COP y 100 USD; segunda apertura rechazada | Correcto |
| Ingresos | Ingreso de 400.000 COP, importe cero rechazado y cuenta inexistente rechazada | Correcto |
| Gastos | Gasto de 78.300 COP, gasto de 25 USD, importe negativo y descripción excesiva rechazados | Correcto |
| Reversión | Gasto de 5.000 COP revertido; segunda reversión rechazada; historial enlaza original y reversión | Correcto |
| Transferencias | 100.000 COP entre cuentas propias; una sola fila lógica en historial | Correcto |
| Transferencias inválidas | Misma cuenta, distinta moneda, saldo insuficiente, importe cero y cuenta inactiva | Correcto |
| Créditos | Alta con desembolso real, cuotas, capital, reversión de cuota y nuevo pago | Correcto |
| Créditos inválidos | Pago futuro, pago superior a deuda, moneda ajena, doble reversión y eliminación con historial | Correcto |
| Créditos sin movimientos | Crear, editar, versión obsoleta rechazada, eliminar y verificar inexistencia | Correcto |
| Consultas de crédito | Amortización, simulación, plan frente a realidad | Correcto salvo simulación de pago anticipado descrita abajo |
| Reportes | Desembolso y pago de crédito no alteran ingresos/gastos; COP y USD separados | Correcto |
| Filtros | Mes fuera de rango y tamaño de página excesivo | Correcto |

### Reconciliación por cuentas nuevas

| Cuenta | ID | Saldo después del recorrido |
| --- | --- | --- |
| COP origen | 17 | 1.221.700 COP |
| COP destino | 18 | 500.000 COP |
| USD | 19 | 75 USD |

El crédito de prueba ID 9 conserva 200.000 COP de capital pendiente tras el pago activo de 100.000 COP. La cuota anterior ID 14 está revertida y la cuota ID 15 está activa. El crédito editable ID 10 fue eliminado de forma autorizada al no tener movimientos. El gasto ID 63 está revertido; el gasto COP ID 62 y el gasto USD ID 65 permanecen como evidencia del recorrido.

Antes y después de desembolsar, pagar y revertir una cuota, los reportes permanecieron idénticos: ingreso COP 1.954.500, gasto COP 486.772 y gasto USD 25. Los totales incluyen otros datos ficticios y las pruebas simultáneas de categorías; esta comprobación compara las dos instantáneas inmediatas de la fase de crédito.

## Fallos corregidos

### F-API-01 — Intereses ficticios al terminar anticipadamente un crédito

Reproducción en el servidor que estaba activo: `/credits/simulate/free`, capital 1.000, tasa 0%, dos cuotas y abono extra 900 en la primera cuota. La respuesta mostraba **400 de intereses**, pese a tener tasa cero. Un caso con tasa 12% también convertía una cuota final de menor valor en intereses: 169,87 en vez de 1,61.

La causa estaba en `CreditAmortizationService.schedule`: al superar el capital pendiente, se reducía el capital regular y se rellenaba la diferencia de la cuota fija como interés. Ahora se conserva el interés devengado, se aplica primero el capital regular y se limita el abono extra al saldo restante. Una última cuota inferior reduce el pago efectivo. La última cuota contractual también liquida el céntimo acumulado del redondeo; 1.000 / 3 termina en 333,34 y saldo cero.

Esto corrige proyecciones; no reescribe pagos, ledger ni transacciones históricas. Las nuevas pruebas comprueban tasa cero, tasa positiva, conservación del capital y liquidación del redondeo.

### F-API-02 — Parámetros inválidos produciendo errores internos

Se reprodujeron respuestas 500 con mes textual, mes obligatorio ausente, tipo de transacción inexistente e identificador textual. Se añadieron manejadores específicos para errores de conversión y parámetros ausentes: responden 400 con el contrato estándar y `fieldErrors` localizado. Las pruebas comprueban los nombres de los campos y evitan que se expongan valores de entrada.

### F-API-03 — Importe que se redondea a cero antes de persistir

Un gasto de `0.00001` y un pago de crédito con cuenta de `0.001` llegaban hasta la restricción de base de datos y devolvían 500. La transacción rechazaba la escritura, pero el usuario recibía un error interno en lugar de un error del campo.

Se validan hasta 15 dígitos enteros y cuatro decimales para ingresos, gastos y aperturas, respetando `NUMERIC(19,4)` existente. Los pagos y abonos de crédito admiten hasta dos decimales, conforme al cálculo de cuotas que ya usa el sistema. Una prueba de integración verifica que los rechazos no creen transacciones, asientos ni pagos y que continúen funcionando los importes válidos de cuatro decimales y cuotas de dos decimales.

## Límites de esta validación

Los casos anteriores corresponden a la API real y a pruebas automatizadas. La navegación, los temas, el widget y la captura se documentan en el recorrido móvil coordinado. El aislamiento entre usuarios se cubre además en las pruebas de integración existentes; no se accedió a datos privados de otro usuario desde la sesión de pruebas.

El contrato actual permite revertir públicamente gastos y cuotas de crédito. No dispone de una operación pública general para revertir ingresos o transferencias. Esto queda como decisión funcional pendiente; no se añadió un endpoint ni se cambió la semántica contable durante esta corrección.

La comprobación final de los arreglos contra el servidor reiniciado debe quedar registrada en `api-edge-state.json` y en la evidencia de simulación posterior al despliegue local.
