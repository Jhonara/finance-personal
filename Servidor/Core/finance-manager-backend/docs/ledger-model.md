# Ledger mínimo

`FinancialTransaction` conserva la intención de negocio y `LedgerEntry` el impacto firmado en una cuenta.
El saldo se deriva con `SUM(signed_amount)` de entradas cuya transacción no esté `VOIDED`; no se materializa en `Account`.

Las operaciones creadas en esta fase se publican juntas en una transacción de base de datos: una operación y una entrada.
Las entradas no exponen edición ni borrado. Las correcciones futuras se modelarán con reversos que conserven el historial.

## Adaptación temporal de ingresos y gastos

Los nuevos `POST /api/incomes` y `POST /api/expenses` exigen una cuenta y escriben solo en el ledger.
Las tablas legacy conservan únicamente el histórico previo. Las lecturas mensuales y los agregados combinan ambos orígenes hasta la migración histórica de la fase 3C5; no usan un corte por fecha, por lo que una operación retrospectiva nueva permanece visible.
