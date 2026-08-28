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

La configuración local actual está en `src/main/resources/application.yaml`. En fases posteriores, sus valores sensibles se moverán a variables de entorno.

## Build y pruebas

```powershell
.\mvnw.cmd clean
.\mvnw.cmd test
.\mvnw.cmd verify
```

En macOS/Linux, sustituye `mvnw.cmd` por `./mvnw`.

El test de contexto usa el perfil `test` y una base H2 en memoria; no se conecta ni modifica PostgreSQL local.

## Configuración futura por entorno

Los perfiles `local`, `test` y `prod` requerirán, como mínimo: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION` y `CORS_ALLOWED_ORIGINS`. No incluyas valores reales en el repositorio.

## Estructura básica

- `src/main/java`: aplicación y módulos de negocio.
- `src/main/resources`: configuración de ejecución.
- `src/test`: pruebas y configuración aislada de test.
- `.mvn`: configuración y wrapper Maven.
