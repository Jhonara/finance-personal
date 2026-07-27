package com.jr.finance.api.credit;

import com.jr.finance.api.credit.dto.CreditScenarioCompareRequest;
import com.jr.finance.api.credit.dto.CreditScenarioCompareResponse;
import com.jr.finance.api.credit.dto.CreditScenarioRequest;
import com.jr.finance.api.credit.dto.CreditSimulationRequest;
import com.jr.finance.api.credit.dto.CreditSimulationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CreditScenarioCompareService {

    private final CreditSimulationService simulationService;

    public List<CreditScenarioCompareResponse> compareScenarios(CreditScenarioCompareRequest request) {

        log.info("Comparando {} escenarios de crédito.", request.getScenarios().size());

        List<CreditScenarioCompareResponse> results = new ArrayList<>();

        for (CreditScenarioRequest scenario : request.getScenarios()) {

            CreditSimulationRequest baseRequest = request.getBase();

            // Clonar la configuración base para no modificar el request original
            CreditSimulationRequest simulationRequest = new CreditSimulationRequest();
            simulationRequest.setPrincipal(baseRequest.getPrincipal());
            simulationRequest.setAnnualRate(baseRequest.getAnnualRate());
            simulationRequest.setTermMonths(baseRequest.getTermMonths());
            simulationRequest.setDisbursementDate(baseRequest.getDisbursementDate());
            simulationRequest.setPaymentDay(baseRequest.getPaymentDay());
            simulationRequest.setCurrentInstallment(baseRequest.getCurrentInstallment());
            simulationRequest.setToday(baseRequest.getToday());

            Map<Integer, BigDecimal> extraPayments = new HashMap<>();
            extraPayments.put(
                    scenario.getInstallment(),
                    scenario.getExtraPayment()
            );

            simulationRequest.setExtraPayments(extraPayments);

            CreditSimulationResponse simulation =
                    simulationService.simulateInternal(simulationRequest);

            results.add(
                    new CreditScenarioCompareResponse(
                            "Cuota " + scenario.getInstallment()
                                    + " - Abono " + scenario.getExtraPayment(),
                            simulation.getTotalToPayToday(),
                            simulation.getSavedInstallments(),
                            simulation.getRemainingInstallments()
                    )
            );
        }

        log.info("Comparación de escenarios finalizada correctamente.");

        return results;
    }
}