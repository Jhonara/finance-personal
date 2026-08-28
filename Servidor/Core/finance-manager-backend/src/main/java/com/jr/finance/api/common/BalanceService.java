package com.jr.finance.api.common;

import com.jr.finance.api.common.dto.MonthlyBalanceResponse;
import com.jr.finance.api.expense.ExpenseRepository;
import com.jr.finance.api.income.IncomeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class BalanceService {

    private final IncomeRepository incomeRepository;
    private final ExpenseRepository expenseRepository;

    public MonthlyBalanceResponse monthlyBalance(Long userId, int year, int month) {

        log.info("Calculando balance mensual del usuario {} para {}/{}.",
                userId,
                month,
                year);

        var yearMonth = FinancialPeriod.of(year, month);

        var startDate = yearMonth.atDay(1);
        var endDate = yearMonth.atEndOfMonth();

        BigDecimal totalIncome = incomeRepository.totalByPeriod(userId, startDate, endDate);
        BigDecimal totalExpense = expenseRepository.totalByPeriod(userId, startDate, endDate);

        totalIncome = totalIncome != null ? totalIncome : BigDecimal.ZERO;
        totalExpense = totalExpense != null ? totalExpense : BigDecimal.ZERO;

        BigDecimal balance = totalIncome.subtract(totalExpense);

        String insight;

        if (balance.compareTo(BigDecimal.ZERO) > 0) {
            insight = "Vas bien: estás en superávit este mes. Considera ahorrar una parte.";
        } else if (balance.compareTo(BigDecimal.ZERO) < 0) {
            insight = "Cuidado: estás en déficit este mes. Revisa en qué puedes recortar.";
        } else {
            insight = "Estás justo en equilibrio este mes.";
        }

        log.info("Balance mensual calculado correctamente para el usuario {}.", userId);

        return new MonthlyBalanceResponse(
                year,
                month,
                totalIncome,
                totalExpense,
                balance,
                insight
        );
    }
}
