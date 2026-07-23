package com.jr.finance.api.expense.mapper;

import com.jr.finance.api.expense.Expense;
import com.jr.finance.api.expense.dto.ExpenseResponse;
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
}