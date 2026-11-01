# Validación local de categorías y reportes — 30 de octubre de 2026

## Base personal y recuperación

Se aplicaron Flyway V23 y V24 a `finance_personal`, PostgreSQL local en el puerto 5432. Ambas constan como exitosas en `flyway_schema_history`. Hibernate validó el esquema con `ddl-auto=validate`; no se usó `clean`, recreación de tablas ni reasignación automática de categorías.

Antes de migrar se creó y comprobó mediante `pg_restore --list` el respaldo en formato custom:

`target/category-hierarchy-qa/finance_personal-before-20261030-130406.dump`

SHA-256: `B19DC3D4BB2E880AEC788DC588FEE8BF8BCF76454CFFCAEBEC546FF3979DA99A`.

La comparación inicial, posterior a la migración y de cierre verificó los conteos y huellas de las filas de las 24 tablas de aplicación: 897 registros conservados, sin diferencias. Se excluyeron únicamente el historial Flyway y las columnas recién agregadas del cálculo de huellas. Las 38 categorías conservan sus IDs y ninguna recibió un padre automáticamente. Los movimientos, presupuestos y referencias históricas existentes permanecen intactos.

Los archivos `snapshot.sql`, `before.json`, `after.json` y `final.json` se conservan localmente en `target/category-hierarchy-qa/`, fuera del seguimiento Git. El backend final queda ejecutándose en el puerto 8080 sobre la base personal, con el procesador habitual de recurrencias habilitado.

## Pruebas automatizadas

- Backend: 157 pruebas, cero fallos, errores u omisiones. Incluyen esquema real PostgreSQL, migración de datos anteriores, API integral, jerarquía y aislamiento de categorías, presupuestos, reportes, transferencias, reversos, créditos y funcionalidades existentes.
- Empaquetado final del backend: correcto. El primer intento de `verify` completó las pruebas pero encontró el JAR bloqueado por los servidores activos en Windows; se detuvieron los dos procesos identificados, se ejecutó `package -DskipTests` correctamente y se reinició la aplicación final.
- Mobile: 78 archivos y 665 pruebas aprobadas; TypeScript y ESLint sin errores. Las pruebas incluyen widget, borradores, captura, accesos rápidos, formularios y reportes.
- Se añadió cobertura para distinguir techo general de límites individuales, gasto directo sin presupuesto y privacidad de porcentajes. Se corrigieron dos fixtures antiguos: retiro de padre con nombre duplicado y moneda obligatoria de meta de ahorro.
- Se impide reactivar una subcategoría con padre inactivo; una prueba comprueba la reactivación ordenada sin perder la relación.

Docker Desktop no pudo iniciar por un socket local inaccesible. Se ejecutaron las mismas pruebas PostgreSQL, sin omitirlas, mediante un clúster PostgreSQL 18.4 temporal en `127.0.0.1:55432`, separado de la base personal. El soporte de pruebas crea una base aleatoria por clase y la elimina al terminar; rechaza el puerto 5432, hosts externos y roles que no comiencen por `finance_test`. Testcontainers PostgreSQL 16 sigue siendo la opción predeterminada cuando Docker está disponible.

## Validación real en Android

Se utilizó `emulator-5554` con el cliente de desarrollo ya instalado, cargando el JavaScript actualizado mediante Metro. No se desinstaló la app ni se borró su almacenamiento. Los movimientos de prueba se crearon en una base ficticia separada y un backend temporal en el puerto 18080; no se insertaron en `finance_personal`.

Recorridos comprobados:

1. Administración de categorías, distinción visual entre padre e hijos, despliegue y contracción de grupos.
2. Conversión de una categoría existente en subcategoría: mismo ID y misma referencia del movimiento previo; el historial aparece en el nuevo grupo.
3. Creación de presupuesto y creación rápida de una subcategoría bajo un padre existente.
4. Registro de gasto e ingreso mediante accesos rápidos, selección jerárquica y separación de tipos; actualización de reportes y presupuesto.
5. Reportes de gastos e ingresos por padre y subcategoría, y consulta de las transacciones que componen Bonificaciones.
6. Comparación presupuesto vs. gasto: techo general contado una sola vez, asignaciones individuales, disponible, porcentajes y gastos sin presupuesto.
7. Ocultación de importes y porcentajes mediante el modo privacidad.

Valores contrastados con la API después de las acciones del emulador:

| Comprobación                 | Resultado |
| ---------------------------- | --------: |
| Gastos COP                   |   601.500 |
| Ingresos COP                 | 4.625.000 |
| Presupuesto aplicado total   |   700.000 |
| Techo de Alimentación        |   500.000 |
| Gastado en Alimentación      |   401.500 |
| Disponible de Alimentación   |    98.500 |
| Utilización de Alimentación  |    80,3 % |
| Gasto sin presupuesto        |   200.000 |
| Gastos USD, separados de COP |        25 |

Las transferencias propias, el desembolso y el pago de crédito no aumentan los ingresos o gastos de estos reportes. La compra con tarjeta aporta 50.000 al gasto una sola vez; el reverso de otro gasto compensa el original.

Las capturas y comprobaciones API quedan en `finance-personal-mobile/.tmp/category-hierarchy-20261030/`, con datos ficticios. La recompilación nativa debug encontró el problema de longitud de rutas CMake/worklets en Windows; esta validación acredita la ejecución real del JavaScript en el cliente instalado, no la generación ni instalación de un APK nuevo.

Al terminar se cerró la sesión ficticia, se restauraron las animaciones originales del emulador y se apagaron el backend de QA y el clúster PostgreSQL temporal. Metro quedó conectado a `http://10.0.2.2:8080/api/v1`, mediante servidor de desarrollo en loopback y `adb reverse` para el puerto 8081. La app queda en la pantalla de acceso para usar las credenciales habituales de la base personal.
