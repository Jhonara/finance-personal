# Ledger mínimo

`FinancialTransaction` conserva la intención de negocio y `LedgerEntry` el impacto firmado en una cuenta.
El saldo se deriva con `SUM(signed_amount)` de entradas cuya transacción no esté `VOIDED`; no se materializa en `Account`.

Las operaciones creadas en esta fase se publican juntas en una transacción de base de datos: una operación y una entrada.
Las entradas no exponen edición ni borrado. Las correcciones futuras se modelarán con reversos que conserven el historial.

## Ciclo de vida y reversión

`POSTED` representa una operación efectiva. `REVERSED` identifica una operación original cuya corrección ya se publicó; sus entradas siguen participando en el saldo. `VOIDED` queda reservado para operaciones sin efecto financiero y no sustituye una reversión monetaria.

Una reversión crea una nueva transacción `REVERSAL` con entradas de signo opuesto, conserva cuenta, moneda, categoría y metadatos de la original, y marca la original como `REVERSED`, todo en una sola transacción. La reversión usa la fecha efectiva actual: el hecho original se mantiene en su periodo y la corrección aparece en el periodo en que se hizo. No se permiten reversos de reversos ni más de una reversión por operación. Una cuenta inactiva no admite operaciones normales, pero sí esta corrección técnica sobre sus entradas históricas.

Las lecturas y agregados que combinan los orígenes clasifican internamente cada fila por su repositorio de origen (`legacy` o `ledger`); para ledger, incluyen un reverso como ajuste del tipo de la operación original. Por ello, un reverso de gasto se expone en la lectura compatible como monto negativo y reduce el total del periodo de su propia fecha.

Durante la transición, `DELETE /api/expenses/{id}` elimina un gasto legacy y revierte un gasto ledger. La resolución consulta explícitamente cada origen; además, los ids nuevos de `incomes`, `expenses` y `financial_transactions` comparten una secuencia de PostgreSQL para impedir colisiones futuras. No existe todavía `DELETE /api/incomes`.

`incomeType`, `paymentType` y `expenseType` son metadatos transitorios de compatibilidad con la API legacy; se conservan en las transacciones y reversos hasta el cutover, donde deberá decidirse su modelo definitivo.

## Adaptación temporal de ingresos y gastos

Los nuevos `POST /api/incomes` y `POST /api/expenses` exigen una cuenta y escriben solo en el ledger.
Las tablas legacy conservan únicamente el histórico previo. Las lecturas mensuales y los agregados combinan ambos orígenes hasta la migración histórica de la fase 3C5; no usan un corte por fecha, por lo que una operación retrospectiva nueva permanece visible.
