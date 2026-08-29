package com.jr.finance.api.account.dto;

import com.jr.finance.api.account.AccountType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@Schema(name = "AccountResponse", description = "Metadatos de una cuenta financiera, sin saldo calculado.")
public class AccountResponse {

    private Long id;
    private String name;
    private AccountType type;
    private String currency;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @Schema(description = "Versión requerida para actualizaciones optimistas.", example = "0")
    private Long version;
}
