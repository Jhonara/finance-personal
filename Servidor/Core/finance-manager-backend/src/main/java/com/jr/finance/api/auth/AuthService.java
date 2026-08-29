package com.jr.finance.api.auth;

import com.jr.finance.api.auth.dto.LoginRequest;
import com.jr.finance.api.auth.dto.RegisterRequest;
import com.jr.finance.api.auth.dto.AuthResponse;
import com.jr.finance.api.common.exception.ConflictException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.common.exception.UnauthorizedException;
import com.jr.finance.api.user.Role;
import com.jr.finance.api.user.RoleRepository;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    @Value("$" + "{jwt.refresh-expiration}") private long refreshExpiration;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public AuthResponse register(RegisterRequest request) {

        log.info("Registrando nuevo usuario con correo {}.", request.getEmail());

        Role userRole = roleRepository.findByName("USER")
                .orElseThrow(() -> {
                    log.warn("No se encontró el rol USER.");
                    return new NotFoundException("El rol USER no existe");
                });

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            log.warn("Intento de registrar un correo ya existente: {}.", request.getEmail());
            throw new ConflictException("El correo electrónico ya está registrado");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.getRoles().add(userRole);

        userRepository.save(user);

        log.info("Usuario {} registrado correctamente.", request.getEmail());

        return issueTokens(user, UUID.randomUUID());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {

        log.info("Intento de autenticación para el usuario {}.", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.warn("Credenciales inválidas durante el inicio de sesión.");
                    return new UnauthorizedException("Credenciales inválidas");
                });

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Credenciales inválidas para el usuario {}.", request.getEmail());
            throw new UnauthorizedException("Credenciales inválidas");
        }

        log.info("Usuario {} autenticado correctamente.", request.getEmail());

        return issueTokens(user, UUID.randomUUID());
    }

    @Transactional(noRollbackFor = UnauthorizedException.class)
    public AuthResponse refresh(String rawToken) {
        RefreshToken current = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new UnauthorizedException("Refresh token inválido"));
        LocalDateTime now = LocalDateTime.now();
        if (current.getRevokedAt() != null) {
            refreshTokenRepository.revokeByFamilyId(current.getFamilyId(), now);
            throw new UnauthorizedException("Refresh token inválido");
        }
        if (!current.getExpiresAt().isAfter(now)) {
            current.setRevokedAt(now);
            refreshTokenRepository.save(current);
            throw new UnauthorizedException("Refresh token inválido");
        }
        AuthResponse response = issueTokens(current.getUser(), current.getFamilyId());
        RefreshToken replacement = refreshTokenRepository.findByTokenHash(hash(response.refreshToken())).orElseThrow();
        current.setRevokedAt(now);
        current.setReplacedById(replacement.getId());
        refreshTokenRepository.save(current);
        return response;
    }

    @Transactional
    public void logout(String rawToken) {
        RefreshToken token = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new UnauthorizedException("Refresh token inválido"));
        if (token.getRevokedAt() != null || !token.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw new UnauthorizedException("Refresh token inválido");
        }
        token.setRevokedAt(LocalDateTime.now());
        refreshTokenRepository.save(token);
    }

    @Transactional
    public void logoutAll(Long userId) {
        refreshTokenRepository.revokeByUserIdAndRevokedAtIsNull(userId, LocalDateTime.now());
    }

    private AuthResponse issueTokens(User user, UUID familyId) {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        String rawRefreshToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setId(UUID.randomUUID());
        refreshToken.setFamilyId(familyId);
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hash(rawRefreshToken));
        refreshToken.setCreatedAt(LocalDateTime.now());
        refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(refreshExpiration / 1000));
        refreshTokenRepository.save(refreshToken);
        return new AuthResponse(jwtService.generateToken(user.getEmail()), rawRefreshToken, "Bearer",
                jwtService.getExpirationSeconds());
    }

    private String hash(String token) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo procesar el token", ex);
        }
    }
}
