package com.jr.finance.api.user;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.user.dto.CurrentUserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@Tag(name = "Current user", description = "Perfil del usuario autenticado actual.")
public class CurrentUserController {

    @Operation(summary = "Consultar el perfil actual", description = "Obtiene únicamente el usuario identificado por el Bearer JWT.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Perfil obtenido correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping(produces = "application/json")
    public CurrentUserResponse getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        return new CurrentUserResponse(user.getId(), user.getName(), user.getEmail());
    }
}
