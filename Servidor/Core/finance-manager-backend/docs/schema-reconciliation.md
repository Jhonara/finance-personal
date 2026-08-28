# Reconciliación de esquema

Fuente de verdad desde esta fase: migraciones Flyway. Hibernate valida el resultado y no administra el esquema.

| Objeto | JPA | SQL histórico | PostgreSQL local | Acción de Flyway |
|---|---|---|---|---|
| `users`, `roles`, `user_roles` | Long, relaciones y datos de auditoría | Presentes; `SERIAL` inicial | No accesible desde este entorno | V1 preserva el modelo; se exige validación posterior |
| `categories` | Dueño obligatorio y nombre único por usuario | Dueño nullable, sin único compuesto | No accesible | V2 exige dueño y agrega unicidad `(user_id, name)` |
| `incomes`, `expenses` | Dueño obligatorio; dinero `BigDecimal` | Dueño nullable, `NUMERIC(12,2)` | No accesible | V2 hace dueño obligatorio y usa `NUMERIC(19,4)` |
| `saving_goals` | Incluye `completed`; campos obligatorios | No contiene `completed`; varios campos nullable | No accesible | V2 agrega `completed` y corrige nullability y precisión |
| `saving_movements` | Relación, monto y fecha obligatorios | Campos nullable, `NUMERIC(12,2)` | No accesible | V2 aplica restricciones y `NUMERIC(19,4)` |
| `credits` | `name`, auditoría y `updated_at`; `BigDecimal` | `updated_at` ausente; algunos campos nullable | No accesible | V2 agrega `updated_at`, restricciones y precisión coherente |
| `credit_payments` | Pagos y abonos extra | Presente tras parche histórico, con precisión menor | No accesible | V2 normaliza montos a `NUMERIC(19,4)` |
| `credit_schedule` | Sin entidad ni repositorio actual | Tabla histórica presente | No accesible | V1 la conserva; su modelo funcional queda para Fase 3 |
| `installments` | Sin entidad ni repositorio actual | Tabla histórica presente | No accesible | V1 la conserva; no se modifica ni se usa como fuente funcional |
| `user_alerts_seen` | Unicidad de alerta | `UNIQUE` permite varios `NULL` en `related_id` | No accesible | V2 agrega índice parcial para alertas sin relacionado |

## Política de tipos

- Dinero persistido actual: `BigDecimal` y `NUMERIC(19,4)`. La aplicación no usa `float`, `double`, `REAL` ni `DOUBLE PRECISION` para dinero.
- Tasas: `BigDecimal` y `NUMERIC(9,6)`; no son valores monetarios.
- Fechas de operación financiera: `LocalDate` y `DATE`.
- Auditoría existente: `LocalDateTime` y `TIMESTAMP` sin zona. No se cambia a UTC en esta fase para no alterar semántica histórica; una futura migración de auditoría debe decidirlo explícitamente.
- Los tipos `income_type`, `payment_type` y `expense_type` continúan como `VARCHAR`. Convertirlos a enums de base de datos es una decisión posterior, no parte de esta migración.

## Base existente

La adopción con `FLYWAY_BASELINE_ON_MIGRATE=true` solo es válida si la base coincide con el conjunto histórico completo. Antes debe ejecutarse `flyway-existing-db-preflight.sql` y revisarse también la metadata de columnas e índices. No se habilita el baseline automáticamente ni de forma permanente.
