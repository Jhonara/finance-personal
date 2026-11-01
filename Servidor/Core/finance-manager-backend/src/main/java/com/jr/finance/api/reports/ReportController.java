package com.jr.finance.api.reports;

import com.jr.finance.api.auth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import com.jr.finance.api.expense.CategoryType;
import com.jr.finance.api.ledger.FinancialTransactionType;
import com.jr.finance.api.reports.dto.CategoryReportResponse;
import com.jr.finance.api.reports.dto.BudgetComparisonResponse;
import com.jr.finance.api.transaction.TransactionService;
import com.jr.finance.api.transaction.TransactionQuery;
import com.jr.finance.api.transaction.dto.TransactionPageResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.constraints.*;
import org.springframework.validation.annotation.Validated;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Validated
public class ReportController {
    private final ReportService reports;
    private final TransactionService transactions;
    private final CategoryReportService categoryReports;

    @GetMapping("/transactions")
    @Operation(operationId = "getReportTransactions", summary = "Movimientos que explican el ingreso o gasto mensual neto")
    public TransactionPageResponse reportTransactions(@RequestParam int year, @RequestParam int month,
            @RequestParam @Pattern(regexp = "[A-Z]{3}") String currency, @RequestParam CategoryType type,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size, Authentication authentication) {
        Long owner = ((UserPrincipal) authentication.getPrincipal()).getUser().getId();
        var financialType = type == CategoryType.INCOME ? FinancialTransactionType.INCOME : FinancialTransactionType.EXPENSE;
        return transactions.find(owner, new TransactionQuery(null, null, year, month, null, null, null,
                null, page, size, currency, false, null, null, financialType, null));
    }

    @GetMapping("/expenses") @Operation(operationId = "getReportExpenseTransactions",
            description = "Operaciones que explican el gasto neto del reporte, incluidas reversiones. Filtra antes de paginar.")
    public TransactionPageResponse expenses(@RequestParam int year, @RequestParam int month,
            @RequestParam @Pattern(regexp = "[A-Z]{3}") String currency,
            @RequestParam(required = false) @Size(max = 100) String category,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size, Authentication auth) {
        Long owner = ((UserPrincipal) auth.getPrincipal()).getUser().getId();
        return transactions.find(owner, new TransactionQuery(null, null, year, month, null, null,
                null, null, page, size, currency, true, category));
    }

    @GetMapping("/month")
    public Map<String, MonthlyCurrencyReport> month(@RequestParam int year, @RequestParam int month,
                                                      Authentication authentication) {
        var principal = (UserPrincipal) authentication.getPrincipal();
        return reports.month(principal.getUser().getId(), year, month);
    }

    @GetMapping("/categories")
    @Operation(operationId = "getHierarchicalCategoryReport", summary = "Totales mensuales por grupo y categoría")
    public CategoryReportResponse categories(@RequestParam int year, @RequestParam int month,
            @RequestParam @Pattern(regexp = "[A-Z]{3}") String currency,
            @RequestParam CategoryType type, Authentication authentication) {
        return categoryReports.categories(((UserPrincipal) authentication.getPrincipal()).getUser().getId(),
                year, month, currency, type);
    }

    @GetMapping("/categories/{categoryId}/transactions")
    @Operation(operationId = "getHierarchicalCategoryTransactions", summary = "Movimientos de una categoría o de su grupo")
    public TransactionPageResponse categoryTransactions(@PathVariable Long categoryId,
            @RequestParam int year, @RequestParam int month,
            @RequestParam @Pattern(regexp = "[A-Z]{3}") String currency,
            @RequestParam CategoryType type,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size, Authentication authentication) {
        Long owner = ((UserPrincipal) authentication.getPrincipal()).getUser().getId();
        var financialType = type == CategoryType.INCOME ? FinancialTransactionType.INCOME : FinancialTransactionType.EXPENSE;
        return transactions.find(owner, new TransactionQuery(null, null, year, month, null, null, null,
                null, page, size, currency, false, null, null, financialType, categoryId));
    }

    @GetMapping("/categories/uncategorized/transactions")
    @Operation(operationId = "getUncategorizedReportTransactions", summary = "Movimientos sin categoría del reporte")
    public TransactionPageResponse uncategorizedTransactions(@RequestParam int year, @RequestParam int month,
            @RequestParam @Pattern(regexp = "[A-Z]{3}") String currency,
            @RequestParam CategoryType type,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size, Authentication authentication) {
        Long owner = ((UserPrincipal) authentication.getPrincipal()).getUser().getId();
        var financialType = type == CategoryType.INCOME ? FinancialTransactionType.INCOME : FinancialTransactionType.EXPENSE;
        return transactions.find(owner, new TransactionQuery(null, null, year, month, null, null, null,
                null, page, size, currency, false, "Sin categoría", null, financialType, null));
    }

    @GetMapping("/budget-vs-actual")
    @Operation(operationId = "getBudgetVsActualReport", summary = "Comparación mensual de presupuestos y gastos")
    public BudgetComparisonResponse budgetVsActual(@RequestParam int year, @RequestParam int month,
                                                   Authentication authentication) {
        return categoryReports.budgetVsActual(((UserPrincipal) authentication.getPrincipal()).getUser().getId(),
                year, month);
    }
}
