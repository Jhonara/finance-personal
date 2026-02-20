package com.jr.finance.api.credit;

import com.jr.finance.api.credit.dto.*;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CreditScenarioCompareService {

    private final CreditSimulationService simulationService;

    public CreditScenarioCompareService(CreditSimulationService simulationService) {
        this.simulationService = simulationService;
    }

    public List<CreditScenarioCompareResponse> compareScenarios(CreditScenarioCompareRequest req) {

        List<CreditScenarioCompareResponse> results = new ArrayList<>();

        for (CreditScenarioRequest scenario : req.getScenarios()) {

            CreditSimulationRequest simReq = req.getBase();

            // Clonamos la base para no mutar el request original
            CreditSimulationRequest copy = new CreditSimulationRequest();
            copy.setPrincipal(simReq.getPrincipal());
            copy.setAnnualRate(simReq.getAnnualRate());
            copy.setTermMonths(simReq.getTermMonths());
            copy.setDisbursementDate(simReq.getDisbursementDate());
            copy.setPaymentDay(simReq.getPaymentDay());
            copy.setCurrentInstallment(simReq.getCurrentInstallment());
            copy.setToday(simReq.getToday());

            Map<Integer, java.math.BigDecimal> extras = new HashMap<>();
            extras.put(scenario.getInstallment(), scenario.getExtraPayment());
            copy.setExtraPayments(extras);

            var response = simulationService.simulateInternal(copy);

            results.add(new CreditScenarioCompareResponse(
                    "Cuota " + scenario.getInstallment() + " - Abono " + scenario.getExtraPayment(),
                    response.getTotalToPayToday(),
                    response.getSavedInstallments(),
                    response.getRemainingInstallments()
            ));
        }

        return results;
    }
}
