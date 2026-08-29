package com.jr.finance.api.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LogoutRequest(@NotBlank(message = "El refresh token es obligatorio") String refreshToken) {
}
