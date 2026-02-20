package com.jr.finance.api.credit.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreditScenarioCompareRequest {

    @NotNull(message = "La base de simulación es obligatoria")
    @Valid
    private CreditSimulationRequest base;

    @NotEmpty(message = "Debes enviar al menos un escenario")
    @Valid
    private List<CreditScenarioRequest> scenarios;
}