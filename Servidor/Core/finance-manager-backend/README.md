# Finance Manager Backend

Backend REST de Finance Personal, construido con Spring Boot, Maven y Java 21.

## Requisitos

- JDK 21.
- No requiere una instalación global de Maven: el proyecto incluye Maven Wrapper.
- PostgreSQL para ejecutar la aplicación localmente.
- Docker Desktop activo para las pruebas de integración con PostgreSQL temporal.

## Ejecutar localmente

Desde esta carpeta:

```powershell
.\mvnw.cmd spring-boot:run
```

En macOS/Linux:

```bash
./mvnw spring-boot:run
```

La aplicación usa el perfil `local` por defecto. La configuración sensible se recibe exclusivamente mediante variables de entorno:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRATION` (opcional; por defecto, 24 horas)
- `CORS_ALLOWED_ORIGINS` (opcional en local; obligatorio en producción)

Para producción activa el perfil `prod` mediante `SPRING_PROFILES_ACTIVE=prod`. No guardes valores reales en archivos versionados ni en `.env` dentro del repositorio.

## Esquema y migraciones

Flyway es la fuente de verdad del esquema y Hibernate lo valida (`ddl-auto=validate`); la aplicación no crea ni actualiza tablas. Una base PostgreSQL vacía ejecuta automáticamente las migraciones al iniciar.

Para una base previa sin historial de Flyway, ejecuta primero el diagnóstico de solo lectura en [docs/flyway-existing-db-preflight.sql](docs/flyway-existing-db-preflight.sql). Si el resultado es compatible con el esquema histórico, habilita una única vez `FLYWAY_BASELINE_ON_MIGRATE=true` al arrancar. Esto registra el baseline `V1` y ejecuta `V2`; no uses esa variable como configuración permanente.

Flyway tiene la limpieza deshabilitada permanentemente. Nunca ejecutes `flyway clean` contra una base con datos.

## Build y pruebas

```powershell
.\mvnw.cmd clean
.\mvnw.cmd test
.\mvnw.cmd verify
```

En macOS/Linux, sustituye `mvnw.cmd` por `./mvnw`.

El perfil `test` mantiene H2 para pruebas rápidas de aplicación. Las pruebas de esquema usan Testcontainers con PostgreSQL 16 temporal, ejecutan Flyway y validan JPA; no se conectan ni modifican PostgreSQL local. Si Docker no está disponible, esas pruebas se omiten explícitamente y la salida lo indicará: H2 no sustituye esa validación.

## Configuración futura por entorno

Perfiles disponibles: `local`, `test` y `prod`. `local` permite únicamente orígenes de desarrollo conocidos; `prod` exige `CORS_ALLOWED_ORIGINS` con una allowlist explícita. No incluyas valores reales en el repositorio.

## Estructura básica

- `src/main/java`: aplicación y módulos de negocio.
- `src/main/resources`: configuración de ejecución.
- `src/test`: pruebas y configuración aislada de test.
- `.mvn`: configuración y wrapper Maven.
