package com.jr.finance.api.credit.mapper;

import com.jr.finance.api.credit.Credit;
import com.jr.finance.api.credit.dto.CreditResponse;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CreditMapper {

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

        return response;
    }

    public List<CreditResponse> toResponseList(List<Credit> credits) {
        return credits.stream()
                .map(this::toResponse)
                .toList();
    }
}