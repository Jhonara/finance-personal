package com.jr.finance.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "Bearer Authentication";

    @Bean
    public OpenAPI customOpenAPI() {

        return new OpenAPI()

                .info(new Info()

                        .title("AI Finance Manager API")

                        .description("""
                                API REST para la gestión de finanzas personales.

                                Incluye módulos de:

                                • Autenticación
                                • Dashboard
                                • Ingresos
                                • Gastos
                                • Categorías
                                • Presupuestos
                                • Créditos
                                • Metas de ahorro
                                • Reportes
                                • Inteligencia Artificial
                                """)

                        .version("1.0.0")

                        .contact(new Contact()
                                .name("Jhonatan Ramirez")
                                .email("jhonatan@example.com"))

                        .license(new License()
                                .name("")))

                .addSecurityItem(
                        new SecurityRequirement()
                                .addList(SECURITY_SCHEME_NAME))

                .components(new Components()

                        .addSecuritySchemes(
                                SECURITY_SCHEME_NAME,

                                new SecurityScheme()

                                        .name("Authorization")

                                        .type(SecurityScheme.Type.HTTP)

                                        .scheme("bearer")

                                        .bearerFormat("JWT")

                                        .in(SecurityScheme.In.HEADER)));
    }
}