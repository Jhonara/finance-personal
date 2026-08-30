package com.jr.finance.api.credit.mapper;

import com.jr.finance.api.credit.Credit;
import com.jr.finance.api.credit.CreditSnapshotService;
import com.jr.finance.api.credit.dto.CreditResponse;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CreditMapper {
    private final CreditSnapshotService snapshotService;
    public CreditMapper(CreditSnapshotService snapshotService) { this.snapshotService = snapshotService; }

    public CreditResponse toResponse(Credit credit) {

        CreditResponse response = new CreditResponse();

        response.setId(credit.getId());
        response.setName(credit.getName());
        response.setPrincipal(credit.getPrincipal());
        response.setAnnualRate(credit.getAnnualRate());
        response.setTermMonths(credit.getTermMonths());
        response.setDisbursementDate(credit.getDisbursementDate());
        response.setPaymentDay(credit.getPaymentDay());
        response.setCreatedAt(credit.getCreatedAt());
        response.setCurrency(credit.getCurrency());
        response.setVersion(credit.getVersion());
        var snapshot = snapshotService.snapshot(credit);
        response.setRemainingBalance(snapshot.remainingBalance());
        response.setStatus(snapshot.status());
        response.setNextPaymentDate(snapshot.nextPaymentDate());
        response.setExpectedPaymentAmount(snapshot.expectedPaymentAmount());
        response.setPaidPrincipal(snapshot.paidPrincipal());
        response.setPaidInterest(snapshot.paidInterest());
        response.setDisbursementLinked(credit.getDisbursementTransaction() != null);
        response.setDisbursementTransactionId(credit.getDisbursementTransaction() == null ? null : credit.getDisbursementTransaction().getId());

        return response;
    }

    public List<CreditResponse> toResponseList(List<Credit> credits) {
        return credits.stream()
                .map(this::toResponse)
                .toList();
    }
}
