package com.jr.finance.api.income;

import com.jr.finance.api.common.FinancialPeriod;
import com.jr.finance.api.income.dto.CreateIncomeRequest;
import com.jr.finance.api.income.dto.IncomeResponse;
import com.jr.finance.api.income.mapper.IncomeMapper;
import com.jr.finance.api.ledger.FinancialOperationCommand;
import com.jr.finance.api.ledger.FinancialTransactionStatus;
import com.jr.finance.api.ledger.FinancialTransactionType;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import com.jr.finance.api.ledger.LedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncomeService {

    private final LedgerService ledgerService;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final IncomeMapper incomeMapper;

    public IncomeResponse create(Long userId, CreateIncomeRequest req) {

        log.info("Creando ingreso para el usuario {}.", userId);

        var transaction = ledgerService.recordIncome(userId, req.getAccountId(),
                new FinancialOperationCommand(req.getAmount(), req.getIncomeDate(), req.getDescription(), null, req.getCategoryId()),
                req.getIncomeType());
        var entry = ledgerEntryRepository.findByFinancialTransactionId(transaction.getId()).orElseThrow();

        log.info("Ingreso {} creado correctamente para el usuario {}.",
                transaction.getId(),
                userId);
        return incomeMapper.toResponse(entry);
    }

    public List<IncomeResponse> listByMonth(Long userId, int year, int month) {

        log.info("Consultando ingresos del usuario {} para {}/{}.",
                userId,
                month,
                year);

        var ym = FinancialPeriod.of(year, month);

        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        List<IncomeResponse> responses = new java.util.ArrayList<>(ledgerEntryRepository.findByUserTypeAndPeriod(userId, FinancialTransactionType.INCOME,
                FinancialTransactionType.REVERSAL, start, end, FinancialTransactionStatus.VOIDED).stream().map(incomeMapper::toResponse).toList());
        return responses.stream().sorted(Comparator.comparing(IncomeResponse::getIncomeDate).reversed()
                .thenComparing(IncomeResponse::getId)).toList();
    }

    public BigDecimal totalByPeriod(Long userId, LocalDate start, LocalDate end) {
        BigDecimal ledgerTotal = ledgerEntryRepository.sumSignedByUserAndTypeAndPeriod(userId,
                FinancialTransactionType.INCOME, FinancialTransactionType.REVERSAL, start, end, FinancialTransactionStatus.VOIDED);
        return ledgerTotal;
    }
}
