package com.jr.finance.api.credit;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.credit.dto.CreditScenarioCompareRequest;
import com.jr.finance.api.credit.dto.CreditScenarioCompareResponse;
import com.jr.finance.api.credit.dto.CreditSimulationRequest;
import com.jr.finance.api.credit.dto.CreditSimulationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/credits")
@RequiredArgsConstructor
@Tag(
        name = "Credits",
        description = "Operaciones para simular créditos, analizar escenarios de pago y comparar abonos extraordinarios."
)
public class CreditSimulationController {

    private final CreditSimulationService creditSimulationService;
    private final CreditService creditService;
    private final CreditScenarioCompareService creditScenarioCompareService;
    private final CreditSnapshotService creditSnapshotService;
    private final CreditPaymentRepository creditPaymentRepository;

    @Operation(
            summary = "Simular un crédito libre",
            description = "Realiza una simulación de un crédito utilizando la información enviada por el usuario, sin necesidad de que el crédito exista en el sistema."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Simulación realizada correctamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos")
    })
    @PostMapping(
            value = "/simulate/free",
            consumes = "application/json",
            produces = "application/json"
    )
    public CreditSimulationResponse simulateFree(
            @Valid @RequestBody CreditSimulationRequest req) {

        return creditSimulationService.simulateInternal(req);
    }

    @Operation(
            summary = "Simular un crédito registrado",
            description = "Realiza una simulación utilizando un crédito existente del usuario. Opcionalmente permite modificar algunos parámetros como abonos extraordinarios o la fecha de simulación."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Simulación realizada correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado"),
            @ApiResponse(responseCode = "404", description = "Crédito no encontrado")
    })
    @PostMapping(
            value = "/{id}/simulate",
            consumes = "application/json",
            produces = "application/json"
    )
    public CreditSimulationResponse simulateExisting(
            @PathVariable Long id,
            @RequestBody(required = false) CreditSimulationRequest overrides,
            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        var credit = creditService.findByIdForUser(userId, id);

        CreditSimulationRequest req = new CreditSimulationRequest();
        var snapshot = creditSnapshotService.snapshot(credit);
        req.setPrincipal(snapshot.remainingBalance());
        req.setAnnualRate(credit.getAnnualRate());
        req.setTermMonths(Math.max(1, credit.getTermMonths() - creditPaymentRepository.findByCreditIdOrderByPaymentDateAsc(id).size()));
        req.setDisbursementDate(java.time.LocalDate.now());
        req.setPaymentDay(credit.getPaymentDay());

        if (overrides != null) {
            req.setExtraPayments(overrides.getExtraPayments());
            req.setToday(overrides.getToday());
            req.setCurrentInstallment(overrides.getCurrentInstallment());
        }

        return creditSimulationService.simulateInternal(req);
    }

    @Operation(
            summary = "Comparar escenarios de abonos",
            description = "Compara múltiples escenarios de abonos extraordinarios y muestra cuál ofrece un mejor resultado en reducción de cuotas y valor pendiente del crédito."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Comparación realizada correctamente",
                    content = @Content(
                            array = @ArraySchema(
                                    schema = @Schema(implementation = CreditScenarioCompareResponse.class)
                            )
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Datos inválidos")
    })
    @PostMapping(
            value = "/simulate/compare",
            consumes = "application/json",
            produces = "application/json"
    )
    public List<CreditScenarioCompareResponse> compare(
            @Valid @RequestBody CreditScenarioCompareRequest req) {

        return creditScenarioCompareService.compareScenarios(req);
    }
}
