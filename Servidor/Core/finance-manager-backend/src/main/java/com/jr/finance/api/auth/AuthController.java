package com.jr.finance.api.auth;

import com.jr.finance.api.auth.dto.AuthResponse;
import com.jr.finance.api.auth.dto.LoginRequest;
import com.jr.finance.api.auth.dto.RegisterRequest;
import com.jr.finance.api.auth.dto.RefreshRequest;
import com.jr.finance.api.auth.dto.LogoutRequest;
import com.jr.finance.api.auth.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import jakarta.servlet.http.HttpServletRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(
        name = "Auth",
        description = "Operaciones relacionadas con el registro e inicio de sesión."
)
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthRateLimitService rateLimitService;

    @Operation(
            summary = "Registrar usuario",
            description = "Endpoint público. Registra un usuario y entrega access token JWT, refresh token opaco y su expiración.", security = {}
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Usuario registrado"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "409", description = "El correo ya existe")
    })

    @PostMapping(
            value = "/register",
            consumes = "application/json",
            produces = "application/json"
    )
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        rateLimitService.check("register", httpRequest.getRemoteAddr(), request.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @Operation(
            summary = "Iniciar sesión",
            description = "Endpoint público. Devuelve access token JWT y refresh token opaco; los intentos están limitados por tasa.", security = {}
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Inicio de sesión exitoso"),
            @ApiResponse(responseCode = "400", description = "Solicitud inválida"),
            @ApiResponse(responseCode = "401", description = "Credenciales incorrectas")
    })
    @PostMapping(
            value = "/login",
            consumes = "application/json",
            produces = "application/json"
    )
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        rateLimitService.check("login", httpRequest.getRemoteAddr(), request.getEmail());
        return authService.login(request);
    }

    @Operation(summary = "Rotar refresh token", description = "Endpoint público. Revoca el refresh token recibido y entrega un nuevo par de tokens.", security = {})
    @ApiResponses({@ApiResponse(responseCode = "200", description = "Tokens rotados"), @ApiResponse(responseCode = "401", description = "Refresh token inválido o revocado"), @ApiResponse(responseCode = "429", description = "Límite de intentos")})
    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
        rateLimitService.check("refresh", httpRequest.getRemoteAddr(), null);
        return authService.refresh(request.refreshToken());
    }

    @Operation(summary = "Cerrar sesión", description = "Revoca el refresh token entregado.", security = {})
    @ApiResponses(@ApiResponse(responseCode = "204", description = "Refresh token revocado"))
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.refreshToken());
    }

    @Operation(summary = "Cerrar todas las sesiones", description = "Revoca todos los refresh tokens activos del usuario autenticado.")
    @ApiResponses(@ApiResponse(responseCode = "204", description = "Sesiones revocadas"))
    @PostMapping("/logout-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logoutAll(Authentication authentication) {
        authService.logoutAll(((UserPrincipal) authentication.getPrincipal()).getUser().getId());
    }
}
