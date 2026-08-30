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
- `JWT_EXPIRATION` (opcional; por defecto, 15 minutos)
- `JWT_REFRESH_EXPIRATION` (opcional; por defecto, 30 días)
- `CORS_ALLOWED_ORIGINS` (opcional en local; obligatorio en producción)
- `SWAGGER_ENABLED` (opcional; habilitado por defecto en `local` y `test`, deshabilitado por defecto en `prod`)

Para producción activa el perfil `prod` mediante `SPRING_PROFILES_ACTIVE=prod`. No guardes valores reales en archivos versionados ni en `.env` dentro del repositorio.

La API oficial usa el prefijo `/api/v1`. La autenticación devuelve un access token JWT y un refresh token rotativo; el refresh token debe almacenarse por el cliente móvil en almacenamiento seguro y puede revocarse mediante `POST /api/v1/auth/logout`.

## OpenAPI y Swagger

Con perfil `local`, abre Swagger UI en `http://localhost:8080/swagger` y el documento OpenAPI en `http://localhost:8080/v3/api-docs`. Ambos usan Bearer JWT para los endpoints protegidos; `register`, `login` y `refresh` son públicos. En producción permanecen deshabilitados salvo que se establezca explícitamente `SWAGGER_ENABLED=true`.

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

El perfil `test` mantiene H2 para pruebas rápidas de aplicación. Las pruebas de esquema usan Testcontainers con PostgreSQL 16 temporal, ejecutan Flyway y validan JPA; no se conectan ni modifican PostgreSQL local. Para el cierre de calidad del proyecto Docker debe estar disponible: la suite exige cero pruebas omitidas.

## Configuración futura por entorno

Perfiles disponibles: `local`, `test` y `prod`. `local` permite únicamente orígenes de desarrollo conocidos; `prod` exige `CORS_ALLOWED_ORIGINS` con una allowlist explícita. No incluyas valores reales en el repositorio.

## Estructura básica

- `src/main/java`: aplicación y módulos de negocio.
- `src/main/resources`: configuración de ejecución.
- `src/test`: pruebas y configuración aislada de test.
- `.mvn`: configuración y wrapper Maven.
