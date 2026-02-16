package com.jr.finance.api.auth;

import com.jr.finance.api.auth.dto.AuthResponse;
import com.jr.finance.api.auth.dto.LoginRequest;
import com.jr.finance.api.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        String token = authService.register(request);
        return new AuthResponse(token);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        String token = authService.login(request);
        return new AuthResponse(token);
    }
}