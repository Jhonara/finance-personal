package com.jr.finance.api.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@Schema(
        name = "ApiErrorResponse",
        description = "Respuesta estándar para errores de la API."
)
public class ApiErrorResponse {

    @Schema(example = "2026-07-24T09:15:33")
    private LocalDateTime timestamp;

    @Schema(example = "404")
    private int status;

    @Schema(example = "NOT_FOUND")
    private String error;

    @Schema(example = "Credit not found")
    private String message;

    @Schema(example = "/api/credits/1")
    private String path;
}