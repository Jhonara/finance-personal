package com.jr.finance.api.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

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
            description = "Código de error HTTP estandarizado.",
            example = "UNAUTHORIZED"
    )
    private String code;

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

    private Map<String, String> fieldErrors;

    public ErrorResponse(String message, String code, int status, LocalDateTime timestamp, String path) {
        this(message, code, status, timestamp, path, Map.of());
    }
}
