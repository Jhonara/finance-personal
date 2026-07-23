package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
@Schema(
        name = "CreditScenarioCompareRequest",
        description = "Información necesaria para comparar diferentes escenarios de abonos extraordinarios sobre un crédito."
)
public class CreditScenarioCompareRequest {

    @Schema(
            description = "Configuración base utilizada para realizar todas las simulaciones."
    )
    @NotNull(message = "La base de simulación es obligatoria")
    @Valid
    private CreditSimulationRequest base;

    @Schema(
            description = "Lista de escenarios de abonos extraordinarios que serán comparados con la simulación base."
    )
    @NotEmpty(message = "Debes enviar al menos un escenario")
    @Valid
    private List<CreditScenarioRequest> scenarios;
}