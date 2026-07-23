package com.jr.finance.api.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(
        name = "LoginRequest",
        description = "Información necesaria para iniciar sesión."
)
public class LoginRequest {

    @Schema(
            description = "Correo electrónico del usuario.",
            example = "jr@test.com"
    )
    @NotBlank(message = "El email es obligatorio")
    @Email(message = "El email no es válido")
    private String email;

    @Schema(
            description = "Contraseña registrada por el usuario.",
            example = "123456"
    )
    @NotBlank(message = "La contraseña es obligatoria")
    private String password;
}