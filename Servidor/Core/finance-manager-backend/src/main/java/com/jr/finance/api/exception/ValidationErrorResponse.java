package com.jr.finance.api.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@Schema(
        name = "ValidationErrorResponse",
        description = "Respuesta para errores de validación."
)
public class ValidationErrorResponse {

    @Schema(example = "2026-07-24T09:15:33")
    private LocalDateTime timestamp;

    @Schema(example = "400")
    private int status;

    @Schema(example = "VALIDATION_ERROR")
    private String error;

    @Schema(example = "Validation failed")
    private String message;

    @Schema
    private Map<String, String> fields;

    @Schema(example = "/api/expenses")
    private String path;
}