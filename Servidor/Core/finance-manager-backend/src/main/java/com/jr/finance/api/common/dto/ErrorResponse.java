package com.jr.finance.api.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@Schema(
        name = "ErrorResponse",
        description = "Representa una respuesta de error devuelta por la API."
)
public class ErrorResponse {

    @Schema(
            description = "Descripción del error.",
            example = "El correo ya se encuentra registrado."
    )
    private String message;

    @Schema(
            description = "Código HTTP de la respuesta.",
            example = "400"
    )
    private int status;

    @Schema(
            description = "Fecha y hora en que ocurrió el error.",
            example = "2026-07-22T15:45:10"
    )
    private LocalDateTime timestamp;

    @Schema(
            description = "Ruta donde ocurrió el error.",
            example = "/api/auth/register"
    )
    private String path;
}