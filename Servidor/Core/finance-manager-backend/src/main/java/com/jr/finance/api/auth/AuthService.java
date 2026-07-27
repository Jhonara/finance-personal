package com.jr.finance.api.auth;

import com.jr.finance.api.auth.dto.LoginRequest;
import com.jr.finance.api.auth.dto.RegisterRequest;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public String register(RegisterRequest request) {

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

        return jwtService.generateToken(user.getEmail());
    }

    public String login(LoginRequest request) {

        log.info("Intento de autenticación para el usuario {}.", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.warn("Usuario {} no encontrado.", request.getEmail());
                    return new NotFoundException("Usuario no encontrado");
                });

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Credenciales inválidas para el usuario {}.", request.getEmail());
            throw new UnauthorizedException("Credenciales inválidas");
        }

        log.info("Usuario {} autenticado correctamente.", request.getEmail());

        return jwtService.generateToken(user.getEmail());
    }
}