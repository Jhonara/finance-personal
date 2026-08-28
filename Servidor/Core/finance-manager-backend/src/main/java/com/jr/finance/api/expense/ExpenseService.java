package com.jr.finance.api.expense;

import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.expense.dto.CreateExpenseRequest;
import com.jr.finance.api.expense.dto.MonthComparisonResponse;
import com.jr.finance.api.expense.dto.MonthlySummaryResponse;
import com.jr.finance.api.expense.dto.PeriodComparisonResponse;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public Expense create(Long userId, CreateExpenseRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Expense e = new Expense();
        e.setUser(user);
        e.setAmount(req.getAmount());
        e.setDescription(req.getDescription());
        e.setPaymentType(req.getPaymentType());
        e.setExpenseType(req.getExpenseType());
        e.setExpenseDate(req.getExpenseDate());

        if (req.getCategoryId() != null) {
            e.setCategory(categoryRepository.findByIdAndUserId(req.getCategoryId(), userId)
                    .orElseThrow(() -> new NotFoundException("Category not found")));
        }

        return expenseRepository.save(e);
    }

    public List<Expense> listByMonth(Long userId, int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        return expenseRepository.findByUserIdAndExpenseDateBetween(
                userId,
                ym.atDay(1),
                ym.atEndOfMonth()
        );
    }

    public MonthlySummaryResponse monthlySummary(Long userId, int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        var start = ym.atDay(1);
        var end = ym.atEndOfMonth();

        BigDecimal total = expenseRepository.totalByPeriod(userId, start, end);
        BigDecimal fixedTotal = expenseRepository.totalByType(userId, "FIXED", start, end);
        BigDecimal variableTotal = expenseRepository.totalByType(userId, "VARIABLE", start, end);

        Map<String, BigDecimal> byCategory = new HashMap<>();
        for (Object[] row : expenseRepository.totalByCategory(userId, start, end)) {
            String category = (String) row[0];
            BigDecimal amount = (BigDecimal) row[1];
            byCategory.put(category != null ? category : "Sin categoría", amount);
        }

        return new MonthlySummaryResponse(total, fixedTotal, variableTotal, byCategory);
    }

//Comparacion mes a mes
    public MonthComparisonResponse compareMonth(Long userId, int year, int month) {
        YearMonth current = YearMonth.of(year, month);
        YearMonth previous = current.minusMonths(1);

        var startCurrent = current.atDay(1);
        var endCurrent = current.atEndOfMonth();

        var startPrev = previous.atDay(1);
        var endPrev = previous.atEndOfMonth();

        BigDecimal currentTotal = expenseRepository.totalByPeriod(userId, startCurrent, endCurrent);
        BigDecimal previousTotal = expenseRepository.totalByPeriod(userId, startPrev, endPrev);

        BigDecimal difference = currentTotal.subtract(previousTotal);

        BigDecimal percentageChange = null;
        if (previousTotal.compareTo(BigDecimal.ZERO) > 0) {
            percentageChange = difference
                    .divide(previousTotal, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        String insight;
        if (previousTotal.compareTo(BigDecimal.ZERO) == 0 && currentTotal.compareTo(BigDecimal.ZERO) > 0) {
            insight = "Este es tu primer mes con gastos registrados.";
        } else if (difference.compareTo(BigDecimal.ZERO) > 0) {
            insight = "Este mes gastaste más que el mes anterior.";
        } else if (difference.compareTo(BigDecimal.ZERO) < 0) {
            insight = "¡Bien! Este mes gastaste menos que el mes anterior.";
        } else {
            insight = "Tu gasto fue igual al mes anterior.";
        }

        return new MonthComparisonResponse(
                year,
                month,
                currentTotal,
                previousTotal,
                difference,
                percentageChange,
                insight
        );
    }

    //comparacion por meses distintos
    public PeriodComparisonResponse comparePeriods(Long userId,
                                                   int year1, int month1,
                                                   int year2, int month2) {

        YearMonth p1 = YearMonth.of(year1, month1);
        YearMonth p2 = YearMonth.of(year2, month2);

        var start1 = p1.atDay(1);
        var end1 = p1.atEndOfMonth();

        var start2 = p2.atDay(1);
        var end2 = p2.atEndOfMonth();

        BigDecimal total1 = expenseRepository.totalByPeriod(userId, start1, end1);
        BigDecimal total2 = expenseRepository.totalByPeriod(userId, start2, end2);

        BigDecimal difference = total1.subtract(total2);

        BigDecimal percentageChange = null;
        if (total2.compareTo(BigDecimal.ZERO) > 0) {
            percentageChange = difference
                    .divide(total2, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        String insight;
        if (total2.compareTo(BigDecimal.ZERO) == 0 && total1.compareTo(BigDecimal.ZERO) > 0) {
            insight = "El segundo periodo no tiene gastos, la comparación es total.";
        } else if (difference.compareTo(BigDecimal.ZERO) > 0) {
            insight = "El primer periodo tiene más gasto que el segundo.";
        } else if (difference.compareTo(BigDecimal.ZERO) < 0) {
            insight = "El primer periodo tiene menos gasto que el segundo.";
        } else {
            insight = "Ambos periodos tienen el mismo gasto.";
        }

        return new PeriodComparisonResponse(
                year1, month1, total1,
                year2, month2, total2,
                difference, percentageChange, insight
        );
    }

    public void delete(Long userId, Long expenseId) {
        Expense e = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new NotFoundException("El gasto no existe"));

        if (!e.getUser().getId().equals(userId)) {
            throw new NotFoundException("El gasto no existe");
        }

        expenseRepository.delete(e);
    }
}
