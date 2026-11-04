# Despliegue en Render Free con Neon

## Servicio web

- Runtime: Docker.
- Root Directory: `Servidor/Core/finance-manager-backend`.
- Dockerfile Path: `Dockerfile` (relativo a Root Directory; la ruta del archivo dentro del repositorio es `Servidor/Core/finance-manager-backend/Dockerfile`).
- Health Check Path: déjalo sin configurar; esta aplicación no tiene un endpoint de salud HTTP dedicado.
- Región: Virginia, junto a la región del proyecto Neon.
- Plan: Free (512 MB RAM).

La imagen se compila con Maven/Java 21 en una etapa y ejecuta únicamente el JRE como usuario sin privilegios. La JVM usa Serial GC, un procesador y un heap limitado al 65 % de la memoria detectada. Hikari mantiene como máximo tres conexiones y no reserva conexiones inactivas. El puerto usa `PORT` de Render y conserva 8080 al ejecutar localmente sin esa variable.

## Variables de entorno en Render

Configura estas variables en **Environment** del servicio. Mantén los valores privados en Render; no los copies al repositorio ni a archivos incluidos en la imagen.

| Variable | Valor |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DB_URL` | URL JDBC de Neon, `jdbc:postgresql://<host-neon>:5432/finance_personal?sslmode=require` (usa el host y parámetros de la cadena de conexión de Neon; no compartas aquí la URL privada) |
| `DB_USERNAME` | Usuario de Neon |
| `DB_PASSWORD` | Contraseña de Neon |
| `JWT_SECRET` | Secreto aleatorio de al menos 32 caracteres; configura uno propio en Render |
| `CORS_ALLOWED_ORIGINS` | Origen HTTPS exacto del frontend, sin comodines; varios orígenes separados por comas |
| `SWAGGER_ENABLED` | `false` (Swagger también queda forzado a desactivado en `prod`) |
| `FLYWAY_BASELINE_ON_MIGRATE` | `false` |
| `LEGACY_MIGRATION_ENABLED` | `false` |

Render asigna `PORT`; no lo definas manualmente. `JWT_EXPIRATION` (900000 ms) y `JWT_REFRESH_EXPIRATION` (2592000000 ms) son opcionales. El backend no usa `DATABASE_URL` de Render: usa las variables `DB_URL`, `DB_USERNAME` y `DB_PASSWORD` que apuntan únicamente a Neon.

## Base existente y migraciones

La aplicación conserva `ddl-auto=validate`, `spring.flyway.clean-disabled=true` y las migraciones actuales. Flyway ejecutaría migraciones pendientes automáticamente en el primer arranque de `prod`; por eso no inicies el servicio contra Neon hasta haber revisado y aprobado el historial de migraciones y el baseline aplicable. Esta preparación no crea ni conecta bases ni ejecuta migraciones remotas. No habilites `FLYWAY_BASELINE_ON_MIGRATE` como ajuste permanente.

El perfil de despliegue no activa el migrador del ledger legado. Los endpoints de Swagger/OpenAPI están desactivados; las rutas de negocio siguen requiriendo autenticación y solo los endpoints de registro, inicio de sesión y sesión son públicos.

## Compatibilidad Flyway

El perfil Maven `render` fija Flyway en 12.0.3 para incluir PostgreSQL 18. El Dockerfile compila con ese perfil; las ejecuciones Maven locales mantienen la versión administrada por Spring Boot. La compatibilidad documentada por Redgate incluye PostgreSQL 18; la dependencia específica `flyway-database-postgresql` ya está declarada en `pom.xml`. No se ha probado una conexión con Neon desde esta preparación.
