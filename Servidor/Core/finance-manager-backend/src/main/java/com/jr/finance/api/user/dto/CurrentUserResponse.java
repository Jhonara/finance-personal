package com.jr.finance.api.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "CurrentUserResponse", description = "Perfil seguro del usuario autenticado actual.")
public record CurrentUserResponse(
        Long id,
        String name,
        String email
) {
}
