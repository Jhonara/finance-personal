# Finance Manager Backend

Backend REST de Finance Personal, construido con Spring Boot, Maven y Java 21.

## Requisitos

- JDK 21.
- No requiere una instalación global de Maven: el proyecto incluye Maven Wrapper.
- PostgreSQL para ejecutar la aplicación localmente.

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

## Build y pruebas

```powershell
.\mvnw.cmd clean
.\mvnw.cmd test
.\mvnw.cmd verify
```

En macOS/Linux, sustituye `mvnw.cmd` por `./mvnw`.

El perfil `test` se activa automáticamente en las pruebas y usa una base H2 en memoria; no se conecta ni modifica PostgreSQL local.

## Configuración futura por entorno

Perfiles disponibles: `local`, `test` y `prod`. `local` permite únicamente orígenes de desarrollo conocidos; `prod` exige `CORS_ALLOWED_ORIGINS` con una allowlist explícita. No incluyas valores reales en el repositorio.

## Estructura básica

- `src/main/java`: aplicación y módulos de negocio.
- `src/main/resources`: configuración de ejecución.
- `src/test`: pruebas y configuración aislada de test.
- `.mvn`: configuración y wrapper Maven.
