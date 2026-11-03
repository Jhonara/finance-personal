package com.jr.finance.api.reports;

import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.common.FinancialPeriod;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.ledger.FinancialTransactionStatus;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountHistoryService {
    private final AccountRepository accounts;
    private final LedgerEntryRepository entries;

    public record Point(LocalDate date, BigDecimal balance, BigDecimal movement) {}
    public record History(String currency, BigDecimal openingBalance, List<Point> points) {}

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public History month(Long owner, Long accountId, int year, int month) {
        var period = FinancialPeriod.of(year, month);
        var account = accounts.findByIdAndUserId(accountId, owner)
                .orElseThrow(() -> new NotFoundException("Cuenta no encontrada"));
        var start = period.atDay(1);
        var end = period.atEndOfMonth();
        var today = LocalDate.now();
        if (start.isAfter(today)) return new History(account.getCurrency(), null, List.of());
        if (end.isAfter(today)) end = today;
        var opening = entries.accountBalanceBefore(owner, accountId, start, FinancialTransactionStatus.VOIDED);
        var balance = opening == null ? BigDecimal.ZERO : opening;
        var points = new ArrayList<Point>();
        for (var day : entries.accountMovementsByDay(owner, accountId, start, end, FinancialTransactionStatus.VOIDED)) {
            balance = balance.add(day.getAmount());
            points.add(new Point(day.getDate(), balance, day.getAmount()));
        }
        return new History(account.getCurrency(), opening, List.copyOf(points));
    }
}
