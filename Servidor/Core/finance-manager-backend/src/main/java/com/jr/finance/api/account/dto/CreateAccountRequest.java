package com.jr.finance.api.account.dto;

import com.jr.finance.api.account.AccountType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(name = "CreateAccountRequest", description = "Información para crear una cuenta financiera.")
public class CreateAccountRequest {

    @NotBlank(message = "El nombre de la cuenta es obligatorio")
    @Size(min = 2, max = 100, message = "El nombre de la cuenta debe tener entre 2 y 100 caracteres")
    private String name;

    @NotNull(message = "El tipo de cuenta es obligatorio")
    private AccountType type;

    @NotBlank(message = "La moneda es obligatoria")
    @Pattern(regexp = "[A-Z]{3}", message = "La moneda debe usar un código ISO-4217 de tres letras mayúsculas")
    private String currency;
}
