package com.jr.finance.api.reports;

import com.jr.finance.api.auth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
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
}
