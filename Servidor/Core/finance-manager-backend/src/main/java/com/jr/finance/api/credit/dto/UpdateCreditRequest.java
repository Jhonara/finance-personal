package com.jr.finance.api.credit.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class UpdateCreditRequest extends CreateCreditRequest {
    @NotNull
    private Long version;
}
