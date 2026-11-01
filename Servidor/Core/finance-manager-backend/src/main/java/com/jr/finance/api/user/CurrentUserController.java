package com.jr.finance.api.user;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.user.dto.CurrentUserResponse;
import com.jr.finance.api.user.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/me")
@Tag(name = "Current user", description = "Perfil del usuario autenticado actual.")
public class CurrentUserController {
    private final UserProfileService profiles;

    @Operation(summary = "Consultar el perfil actual", description = "Obtiene únicamente el usuario identificado por el Bearer JWT.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Perfil obtenido correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping(produces = "application/json")
    public CurrentUserResponse getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        return CurrentUserResponse.from(user);
    }

    @PutMapping(produces = "application/json", consumes = "application/json")
    @Operation(summary = "Actualizar nombres del perfil propio", description = "No cambia correo, credenciales ni información financiera. No infiere apellidos de nombres históricos.")
    public CurrentUserResponse update(@AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody UpdateProfileRequest request) {
        return profiles.update(principal.getUser().getId(), request);
    }
}
