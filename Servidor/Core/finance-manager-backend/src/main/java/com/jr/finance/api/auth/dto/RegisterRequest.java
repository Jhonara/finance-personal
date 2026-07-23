package com.jr.finance.api.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(
        name = "RegisterRequest",
        description = "Información necesaria para registrar un usuario."
)
public class RegisterRequest {

    @Schema(
            description = "Nombre completo del usuario.",
            example = "Jhonatan Ramírez"
    )
    @NotBlank(message = "El nombre es obligatorio")
    private String name;

    @Schema(
            description = "Correo electrónico único del usuario.",
            example = "prueba@correo.com"
    )
    @NotBlank(message = "El email es obligatorio")
    @Email(message = "El email no es válido")
    private String email;

    @Schema(
            description = "Contraseña del usuario. Debe contener al menos 8 caracteres.",
            example = "MiPassword123*"
    )
    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, message = "La contraseña debe tener mínimo 8 caracteres")
    private String password;
}