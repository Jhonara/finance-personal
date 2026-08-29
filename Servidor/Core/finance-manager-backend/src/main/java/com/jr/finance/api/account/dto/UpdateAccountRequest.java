package com.jr.finance.api.account.dto;

import com.jr.finance.api.account.AccountType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Null;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(name = "UpdateAccountRequest", description = "Metadatos editables de una cuenta financiera.")
public class UpdateAccountRequest {

    @Size(min = 2, max = 100, message = "El nombre de la cuenta debe tener entre 2 y 100 caracteres")
    private String name;

    private AccountType type;

    private Boolean active;

    @Null(message = "La moneda no se puede modificar")
    @Schema(hidden = true)
    private String currency;

    @NotNull(message = "La versión de la cuenta es obligatoria")
    private Long version;
}
