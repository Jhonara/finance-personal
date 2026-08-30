package com.jr.finance.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.DateTimeSchema;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "springdoc.api-docs.enabled", havingValue = "true")
public class OpenApiConfig {
    public static final String BEARER_AUTH = "BearerAuth";

    @Bean
    OpenAPI financePersonalOpenApi() {
        Components components = new Components()
                .addSecuritySchemes(BEARER_AUTH, new SecurityScheme().type(SecurityScheme.Type.HTTP)
                        .scheme("bearer").bearerFormat("JWT"));
        return new OpenAPI()
                .info(new Info().title("Finance Personal API").version("1.0")
                        .description("API REST versionada para gestión de finanzas personales. La base pública es `/api/v1`."))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH))
                .components(components);
    }

    @Bean
    OpenApiCustomizer errorResponseSchemaCustomizer() {
        return openApi -> openApi.getComponents().addSchemas("ErrorResponse", new ObjectSchema()
                .description("Contrato uniforme de errores de la API.")
                .addProperty("message", new StringSchema().example("La solicitud no es válida."))
                .addProperty("code", new StringSchema().example("BAD_REQUEST"))
                .addProperty("status", new IntegerSchema().example(400))
                .addProperty("timestamp", new DateTimeSchema())
                .addProperty("path", new StringSchema().example("/api/v1/accounts"))
                .addProperty("fieldErrors", new ObjectSchema()
                        .description("Mapa opcional de campo a mensaje de validación.")));
    }
}
