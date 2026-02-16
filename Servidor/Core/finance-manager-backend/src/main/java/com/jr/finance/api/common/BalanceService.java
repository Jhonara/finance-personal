package com.jr.finance.api.common;

import com.jr.finance.api.common.dto.MonthlyBalanceResponse;
import com.jr.finance.api.expense.ExpenseRepository;
import com.jr.finance.api.income.IncomeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.YearMonth;

@Service
@RequiredArgsConstructor
public class BalanceService {

    private final IncomeRepository incomeRepository;
    private final ExpenseRepository expenseRepository;

    public MonthlyBalanceResponse monthlyBalance(Long userId, int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        var start = ym.atDay(1);
        var end = ym.atEndOfMonth();

        BigDecimal totalIncome = incomeRepository.totalByPeriod(userId, start, end);
        BigDecimal totalExpense = expenseRepository.totalByPeriod(userId, start, end);
        BigDecimal balance = totalIncome.subtract(totalExpense);

        String insight;
        if (balance.compareTo(BigDecimal.ZERO) > 0) {
            insight = "Vas bien: estás en superávit este mes. Considera ahorrar una parte.";
        } else if (balance.compareTo(BigDecimal.ZERO) < 0) {
            insight = "Cuidado: estás en déficit este mes. Revisa en qué puedes recortar.";
        } else {
            insight = "Estás justo en equilibrio este mes.";
        }

        return new MonthlyBalanceResponse(year, month, totalIncome, totalExpense, balance, insight);
    }
}
