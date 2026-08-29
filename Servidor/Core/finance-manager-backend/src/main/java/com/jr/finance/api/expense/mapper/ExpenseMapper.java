package com.jr.finance.api.expense.mapper;

import com.jr.finance.api.expense.Expense;
import com.jr.finance.api.expense.dto.ExpenseResponse;
import com.jr.finance.api.ledger.LedgerEntry;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ExpenseMapper {

    public ExpenseResponse toResponse(Expense expense) {

        ExpenseResponse response = new ExpenseResponse();

        response.setId(expense.getId());

        response.setCategory(
                expense.getCategory() != null
                        ? expense.getCategory().getName()
                        : null
        );

        response.setAmount(expense.getAmount());
        response.setDescription(expense.getDescription());
        response.setPaymentType(expense.getPaymentType());
        response.setExpenseType(expense.getExpenseType());
        response.setExpenseDate(expense.getExpenseDate());

        return response;
    }

    public List<ExpenseResponse> toResponseList(List<Expense> expenses) {
        return expenses.stream()
                .map(this::toResponse)
                .toList();
    }

    public ExpenseResponse toResponse(LedgerEntry entry) {
        var transaction = entry.getFinancialTransaction();
        ExpenseResponse response = new ExpenseResponse();
        response.setId(transaction.getId());
        response.setCategory(transaction.getCategory() == null ? null : transaction.getCategory().getName());
        // A reversal is represented as a negative expense adjustment in legacy-compatible reads.
        response.setAmount(entry.getSignedAmount().negate());
        response.setDescription(transaction.getDescription());
        response.setPaymentType(transaction.getPaymentType());
        response.setExpenseType(transaction.getExpenseType());
        response.setExpenseDate(transaction.getEffectiveDate());
        return response;
    }
}
