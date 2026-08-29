# Ledger mínimo

`FinancialTransaction` conserva la intención de negocio y `LedgerEntry` el impacto firmado en una cuenta.
El saldo se deriva con `SUM(signed_amount)` de entradas cuya transacción no esté `VOIDED`; no se materializa en `Account`.

Las operaciones creadas en esta fase se publican juntas en una transacción de base de datos: una operación y una entrada.
Las entradas no exponen edición ni borrado. Las correcciones futuras se modelarán con reversos que conserven el historial.
