package com.jr.finance.api.expense;

import com.jr.finance.api.common.FinancialPeriod;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.ledger.FinancialTransaction;
import com.jr.finance.api.ledger.FinancialTransactionRepository;
import com.jr.finance.api.expense.dto.CreateExpenseRequest;
import com.jr.finance.api.expense.dto.ExpenseResponse;
import com.jr.finance.api.expense.dto.MonthComparisonResponse;
import com.jr.finance.api.expense.dto.MonthlySummaryResponse;
import com.jr.finance.api.expense.dto.PeriodComparisonResponse;
import com.jr.finance.api.expense.mapper.ExpenseMapper;
import com.jr.finance.api.ledger.FinancialOperationCommand;
import com.jr.finance.api.ledger.FinancialTransactionStatus;
import com.jr.finance.api.ledger.FinancialTransactionType;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import com.jr.finance.api.ledger.LedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final LedgerService ledgerService;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final FinancialTransactionRepository financialTransactionRepository;
    private final ExpenseMapper expenseMapper;

    public ExpenseResponse create(Long userId, CreateExpenseRequest req) {
        var transaction = ledgerService.recordExpense(userId, req.getAccountId(),
                new FinancialOperationCommand(req.getAmount(), req.getExpenseDate(), req.getDescription(), null,
                        req.getCategoryId()), req.getPaymentType(), req.getExpenseType());
        return expenseMapper.toResponse(ledgerEntryRepository.findByFinancialTransactionId(transaction.getId()).orElseThrow());
    }

    public List<ExpenseResponse> listByMonth(Long userId, int year, int month) {
        var ym = FinancialPeriod.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        List<ExpenseResponse> responses = new java.util.ArrayList<>(ledgerEntryRepository.findByUserTypeAndPeriod(userId, FinancialTransactionType.EXPENSE,
                FinancialTransactionType.REVERSAL, start, end, FinancialTransactionStatus.VOIDED).stream().map(expenseMapper::toResponse).toList());
        return responses.stream().sorted(Comparator.comparing(ExpenseResponse::getExpenseDate).reversed()
                .thenComparing(ExpenseResponse::getId)).toList();
    }

    public MonthlySummaryResponse monthlySummary(Long userId, int year, int month) {
        var ym = FinancialPeriod.of(year, month);
        var start = ym.atDay(1);
        var end = ym.atEndOfMonth();

        BigDecimal total = totalByPeriod(userId, start, end);
        BigDecimal fixedTotal = totalByType(userId, "FIXED", start, end);
        BigDecimal variableTotal = totalByType(userId, "VARIABLE", start, end);

        Map<String, BigDecimal> byCategory = new HashMap<>();
        for (var entry : ledgerEntryRepository.findByUserTypeAndPeriod(userId, FinancialTransactionType.EXPENSE,
                FinancialTransactionType.REVERSAL, start, end, FinancialTransactionStatus.VOIDED)) {
            String category = entry.getFinancialTransaction().getCategory() == null
                    ? "Sin categoría" : entry.getFinancialTransaction().getCategory().getName();
            byCategory.merge(category, entry.getSignedAmount().negate(), BigDecimal::add);
        }

        return new MonthlySummaryResponse(total, fixedTotal, variableTotal, byCategory);
    }

//Comparacion mes a mes
    public MonthComparisonResponse compareMonth(Long userId, int year, int month) {
        var current = FinancialPeriod.of(year, month);
        var previous = current.minusMonths(1);

        var startCurrent = current.atDay(1);
        var endCurrent = current.atEndOfMonth();

        var startPrev = previous.atDay(1);
        var endPrev = previous.atEndOfMonth();

        BigDecimal currentTotal = totalByPeriod(userId, startCurrent, endCurrent);
        BigDecimal previousTotal = totalByPeriod(userId, startPrev, endPrev);

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

        var p1 = FinancialPeriod.of(year1, month1);
        var p2 = FinancialPeriod.of(year2, month2);

        var start1 = p1.atDay(1);
        var end1 = p1.atEndOfMonth();

        var start2 = p2.atDay(1);
        var end2 = p2.atEndOfMonth();

        BigDecimal total1 = totalByPeriod(userId, start1, end1);
        BigDecimal total2 = totalByPeriod(userId, start2, end2);

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

    @Transactional
    public void delete(Long userId, Long expenseId) {
        var ledgerTransaction = financialTransactionRepository.findOwnedForReversal(expenseId, userId)
                .orElseThrow(() -> new NotFoundException("El gasto no existe"));
        if (ledgerTransaction.getType() != FinancialTransactionType.EXPENSE) {
            throw new NotFoundException("El gasto no existe");
        }
        ledgerService.reverseTransaction(expenseId, userId);
    }

    public BigDecimal totalByPeriod(Long userId, LocalDate start, LocalDate end) {
        BigDecimal ledgerTotal = ledgerEntryRepository.sumSignedByUserAndTypeAndPeriod(userId,
                FinancialTransactionType.EXPENSE, FinancialTransactionType.REVERSAL, start, end, FinancialTransactionStatus.VOIDED);
        return ledgerTotal.negate();
    }

    private BigDecimal totalByType(Long userId, String type, LocalDate start, LocalDate end) {
        BigDecimal ledgerTotal = ledgerEntryRepository.findByUserTypeAndPeriod(userId,
                        FinancialTransactionType.EXPENSE, FinancialTransactionType.REVERSAL,
                        start, end, FinancialTransactionStatus.VOIDED).stream()
                .filter(entry -> type.equals(entry.getFinancialTransaction().getExpenseType()))
                .map(entry -> entry.getSignedAmount().negate())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return ledgerTotal;
    }
}
