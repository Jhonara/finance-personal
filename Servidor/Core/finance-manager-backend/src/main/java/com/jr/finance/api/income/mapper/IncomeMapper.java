package com.jr.finance.api.income.mapper;

import com.jr.finance.api.income.Income;
import com.jr.finance.api.income.dto.IncomeResponse;
import com.jr.finance.api.ledger.LedgerEntry;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class IncomeMapper {

    public IncomeResponse toResponse(Income income) {

        IncomeResponse response = new IncomeResponse();

        response.setId(income.getId());
        response.setAmount(income.getAmount());
        response.setDescription(income.getDescription());
        response.setIncomeType(income.getIncomeType());
        response.setIncomeDate(income.getIncomeDate());

        return response;
    }

    public List<IncomeResponse> toResponseList(List<Income> incomes) {
        return incomes.stream()
                .map(this::toResponse)
                .toList();
    }

    public IncomeResponse toResponse(LedgerEntry entry) {
        var transaction = entry.getFinancialTransaction();
        IncomeResponse response = new IncomeResponse();
        response.setId(transaction.getId());
        response.setAmount(entry.getSignedAmount());
        response.setDescription(transaction.getDescription());
        response.setIncomeType(transaction.getIncomeType());
        response.setIncomeDate(transaction.getEffectiveDate());
        return response;
    }
}
