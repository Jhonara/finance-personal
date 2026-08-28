package com.jr.finance.api.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(name = "UserResponse", description = "Información administrativa segura de un usuario.")
public record UserResponse(
        Long id,
        String name,
        String email,
        LocalDateTime createdAt
) {
}
