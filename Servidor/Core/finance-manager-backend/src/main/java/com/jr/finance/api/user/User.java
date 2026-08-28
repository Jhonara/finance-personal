package com.jr.finance.api.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(
        name = "User",
        description = "Representa un usuario registrado en el sistema."
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(
            description = "Identificador único del usuario.",
            example = "1",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private Long id;

    @Column(nullable = false, length = 100)
    @Schema(
            description = "Nombre completo del usuario.",
            example = "Jhonatan Ramírez"
    )
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    @Schema(
            description = "Correo electrónico del usuario.",
            example = "jhonatan@email.com"
    )
    private String email;

    @JsonIgnore
    @Column(nullable = false, length = 255)
    @Schema(
            description = "Contraseña cifrada del usuario.",
            accessMode = Schema.AccessMode.WRITE_ONLY
    )
    private String password;

    @Column(name = "created_at", nullable = false)
    @Schema(
            description = "Fecha y hora de creación del usuario.",
            example = "2026-07-22T10:30:00",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Schema(
            description = "Roles asignados al usuario."
    )
    private Set<Role> roles = new HashSet<>();
}
