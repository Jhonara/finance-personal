# Nombres explícitos y perfil propio

La renovación UX conserva `User.name` y añade `firstName`, `lastName` y `displayName`, todos opcionales. V28 agrega únicamente tres columnas nullable a `users`; no divide nombres históricos, no modifica identificadores ni toca tablas financieras.

`GET /api/v1/me` conserva sus campos y devuelve también los nuevos. `PUT /api/v1/me` actualiza solo al usuario autenticado, con el cuerpo completo de sus tres campos de nombre. No admite cambiar correo, roles, contraseña ni otro usuario mediante un identificador enviado en el cuerpo. Los valores vacíos se normalizan a null. Los apellidos requieren un nombre explícito; nombre y apellidos combinados no pueden superar los 100 caracteres del campo histórico. El nombre mostrado admite hasta 50.

Al enviar nombre y apellidos explícitos se actualiza `name` con esas partes. Si ambos están vacíos, se conserva el nombre histórico. El saludo móvil usa `displayName`, después `firstName`, y finalmente un saludo sin nombre; nunca intenta separar `name` por espacios. Borrar `displayName` elimina esa preferencia.

El registro antiguo que solo envía `name` sigue siendo válido. El nuevo registro puede incluir las partes explícitas y el nombre mostrado. No se recopilan fecha de nacimiento, ciudad o imágenes: actualmente no tienen una finalidad funcional que justifique almacenarlas.

Validación: seis pruebas de integración cubren compatibilidad antigua, creación con campos explícitos, actualización propia, límites, autenticación, preservación del nombre histórico y ausencia de cambios del ledger. Se ejecutaron dentro de las 170 pruebas de aplicación, que también incluyen el detalle global de reportes incorporado durante la validación UX. Las pruebas PostgreSQL aisladas que crean bases temporales se excluyeron de esa ejecución; V28 se validó además al iniciar Flyway contra la base local existente, previamente respaldada.
