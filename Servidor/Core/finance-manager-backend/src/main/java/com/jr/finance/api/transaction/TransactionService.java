package com.jr.finance.api.transaction;

import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.expense.CategoryRepository;
import com.jr.finance.api.ledger.*;
import com.jr.finance.api.transaction.dto.TransactionPageResponse;
import com.jr.finance.api.transaction.dto.TransactionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransactionService {
    private final FinancialTransactionRepository transactions;
    private final LedgerEntryRepository entries;
    private final AccountRepository accounts;
    private final CategoryRepository categories;

    @Transactional(readOnly = true)
    public TransactionPageResponse find(Long userId, TransactionQuery query) {
        query = validateAndResolve(userId, query);
        var pageable = PageRequest.of(query.page(), query.size(), Sort.by(Sort.Order.desc("effectiveDate"),
                Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        var page = transactions.findAll(TransactionSpecifications.forQuery(userId, query), pageable);
        List<Long> ids = page.getContent().stream().map(FinancialTransaction::getId).toList();
        Map<Long, List<LedgerEntry>> byTransaction = ids.isEmpty() ? Map.of() : entries
                .findByFinancialTransactionIdInWithAccount(ids).stream()
                .collect(Collectors.groupingBy(entry -> entry.getFinancialTransaction().getId()));
        return new TransactionPageResponse(page.getContent().stream().map(transaction -> map(transaction,
                byTransaction.getOrDefault(transaction.getId(), List.of()))).toList(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isFirst(), page.isLast());
    }

    private TransactionQuery validateAndResolve(Long userId, TransactionQuery query) {
        if (query.from() != null && query.to() != null && query.from().isAfter(query.to())) throw new BadRequestException("from no puede ser posterior a to");
        if ((query.year() == null) != (query.month() == null)) throw new BadRequestException("year y month deben enviarse juntos");
        if (query.year() != null) {
            if (query.from() != null || query.to() != null) throw new BadRequestException("No combines year/month con from/to");
            YearMonth period = com.jr.finance.api.common.FinancialPeriod.of(query.year(), query.month());
            query = new TransactionQuery(period.atDay(1), period.atEndOfMonth(), null, null, query.accountId(), query.categoryId(), query.type(), query.status(), query.page(), query.size());
        }
        if (query.accountId() != null && accounts.findByIdAndUserId(query.accountId(), userId).isEmpty()) throw new NotFoundException("Cuenta no encontrada");
        if (query.categoryId() != null && categories.findByIdAndUserId(query.categoryId(), userId).isEmpty()) throw new NotFoundException("Categoría no encontrada");
        return query;
    }

    private TransactionResponse map(FinancialTransaction transaction, List<LedgerEntry> values) {
        List<LedgerEntry> sorted = new ArrayList<>(values); sorted.sort(Comparator.comparing(entry -> entry.getAccount().getId()));
        LedgerEntry negative = sorted.stream().filter(entry -> entry.getSignedAmount().signum() < 0).findFirst().orElse(null);
        LedgerEntry positive = sorted.stream().filter(entry -> entry.getSignedAmount().signum() > 0).findFirst().orElse(null);
        boolean transfer = transaction.getType() == FinancialTransactionType.TRANSFER;
        LedgerEntry single = sorted.isEmpty() ? null : sorted.getFirst();
        BigDecimal amount = single == null ? BigDecimal.ZERO : transaction.getType() == FinancialTransactionType.OPENING_BALANCE ? single.getSignedAmount() : single.getSignedAmount().abs();
        return new TransactionResponse(transaction.getId(), transaction.getType().name(), transaction.getStatus().name(), transaction.getEffectiveDate(), transaction.getCreatedAt(), transaction.getDescription(), amount, transaction.getCurrency(), transaction.getCategory() == null ? null : transaction.getCategory().getId(), transaction.getCategory() == null ? null : transaction.getCategory().getName(), transfer || single == null ? null : single.getAccount().getId(), transfer || single == null ? null : single.getAccount().getName(), transfer && negative != null ? negative.getAccount().getId() : null, transfer && negative != null ? negative.getAccount().getName() : null, transfer && positive != null ? positive.getAccount().getId() : null, transfer && positive != null ? positive.getAccount().getName() : null, transaction.getReversalOf() == null ? null : transaction.getReversalOf().getId());
    }
}
