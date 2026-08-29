package com.jr.finance.api.transaction;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.ledger.FinancialTransactionStatus;
import com.jr.finance.api.ledger.FinancialTransactionType;
import com.jr.finance.api.transaction.dto.TransactionPageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.LocalDate;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1/transactions")
public class TransactionController {
    private final TransactionService service;

    @Operation(summary = "Historial financiero unificado", description = "Vista paginada de operaciones lógicas del usuario autenticado.")
    @GetMapping
    public TransactionPageResponse list(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) FinancialTransactionType type,
            @RequestParam(required = false) FinancialTransactionStatus status,
            @Parameter(description = "Página desde cero") @RequestParam(defaultValue = "0") @Min(0) int page,
            @Parameter(description = "Tamaño de página, máximo 100") @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            Authentication authentication) {
        Long userId = ((UserPrincipal) authentication.getPrincipal()).getUser().getId();
        return service.find(userId, new TransactionQuery(from, to, year, month, accountId, categoryId, type, status, page, size));
    }
}
