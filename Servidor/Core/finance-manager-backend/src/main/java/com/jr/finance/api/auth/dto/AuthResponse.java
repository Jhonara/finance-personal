package com.jr.finance.api.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

@Schema(
        name = "AuthResponse",
        description = "Respuesta devuelta después de una autenticación exitosa."
)
public record AuthResponse(

        @Schema(
                description = "Token JWT para acceder a los endpoints protegidos.",
                example = "eyJhbGciOiJIUzI1NiJ9..."
        )
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn

) {
}
