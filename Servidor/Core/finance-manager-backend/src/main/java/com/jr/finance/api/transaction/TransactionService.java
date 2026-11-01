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
    private final LedgerService ledger;

    @Transactional(readOnly = true)
    public TransactionResponse detail(Long userId, Long id) {
        var transaction = transactions.findById(id).filter(item -> item.getUser().getId().equals(userId))
                .orElseThrow(() -> new NotFoundException("Movimiento no encontrado"));
        return map(transaction, entries.findByFinancialTransactionIdInWithAccount(List.of(id)), reversalIds(userId, List.of(id)).get(id));
    }

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
        var reversals = reversalIds(userId, ids);
        return new TransactionPageResponse(page.getContent().stream().map(transaction -> map(transaction,
                byTransaction.getOrDefault(transaction.getId(), List.of()), reversals.get(transaction.getId()))).toList(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isFirst(), page.isLast());
    }

    private TransactionQuery validateAndResolve(Long userId, TransactionQuery query) {
        if (query.from() != null && query.to() != null && query.from().isAfter(query.to())) throw new BadRequestException("from no puede ser posterior a to");
        if ((query.year() == null) != (query.month() == null)) throw new BadRequestException("year y month deben enviarse juntos");
        if (query.year() != null) {
            if (query.from() != null || query.to() != null) throw new BadRequestException("No combines year/month con from/to");
            YearMonth period = com.jr.finance.api.common.FinancialPeriod.of(query.year(), query.month());
            query = new TransactionQuery(period.atDay(1), period.atEndOfMonth(), null, null, query.accountId(),
                    query.categoryId(), query.type(), query.status(), query.page(), query.size(), query.currency(),
                    query.expenseReport(), query.reportCategory(), query.searchText(), query.reportType(),
                    query.reportCategoryId());
        }
        if (query.accountId() != null && accounts.findByIdAndUserId(query.accountId(), userId).isEmpty()) throw new NotFoundException("Cuenta no encontrada");
        if (query.categoryId() != null && categories.findByIdAndUserId(query.categoryId(), userId).isEmpty()) throw new NotFoundException("Categoría no encontrada");
        if (query.reportCategoryId() != null && categories.findByIdAndUserId(query.reportCategoryId(), userId).isEmpty()) throw new NotFoundException("Categoría no encontrada");
        return query;
    }

    @Transactional
    public TransactionResponse reverse(Long userId, Long id, String reason) {
        var original = transactions.findOwnedForReversal(id, userId)
                .orElseThrow(() -> new NotFoundException("Movimiento no encontrado"));
        if (!supported(original.getType())) throw new BadRequestException("Esta operación se administra desde su función de origen");
        var reversal = ledger.reverseTransaction(id, userId, reason);
        return detail(userId, reversal.getId());
    }

    private boolean supported(FinancialTransactionType type) {
        return type == FinancialTransactionType.EXPENSE || type == FinancialTransactionType.INCOME
                || type == FinancialTransactionType.TRANSFER;
    }

    private Map<Long, Long> reversalIds(Long userId, List<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        return transactions.findReversals(userId, ids).stream().collect(Collectors.toMap(t -> t.getReversalOf().getId(), FinancialTransaction::getId));
    }

    private TransactionResponse map(FinancialTransaction transaction, List<LedgerEntry> values, Long reversalId) {
        List<LedgerEntry> sorted = new ArrayList<>(values); sorted.sort(Comparator.comparing(entry -> entry.getAccount().getId()));
        LedgerEntry negative = sorted.stream().filter(entry -> entry.getSignedAmount().signum() < 0).findFirst().orElse(null);
        LedgerEntry positive = sorted.stream().filter(entry -> entry.getSignedAmount().signum() > 0).findFirst().orElse(null);
        boolean transfer = transaction.getType() == FinancialTransactionType.TRANSFER
                || transaction.getReversalOf() != null && transaction.getReversalOf().getType() == FinancialTransactionType.TRANSFER;
        LedgerEntry single = sorted.isEmpty() ? null : sorted.getFirst();
        BigDecimal amount = single == null ? BigDecimal.ZERO : transaction.getType() == FinancialTransactionType.OPENING_BALANCE ? single.getSignedAmount() : single.getSignedAmount().abs();
        return new TransactionResponse(transaction.getId(), transaction.getType().name(), transaction.getStatus().name(), transaction.getEffectiveDate(), transaction.getCreatedAt(), transaction.getDescription(), amount, transaction.getCurrency(), transaction.getCategory() == null ? null : transaction.getCategory().getId(), transaction.getCategory() == null ? null : transaction.getCategory().getName(), transfer || single == null ? null : single.getAccount().getId(), transfer || single == null ? null : single.getAccount().getName(), transfer && negative != null ? negative.getAccount().getId() : null, transfer && negative != null ? negative.getAccount().getName() : null, transfer && positive != null ? positive.getAccount().getId() : null, transfer && positive != null ? positive.getAccount().getName() : null, transaction.getReversalOf() == null ? null : transaction.getReversalOf().getId(), reversalId,
                transaction.getReversalOf() == null ? null : transaction.getReversalOf().getType().name(), transaction.getReversalReason(),
                transaction.getStatus() == FinancialTransactionStatus.POSTED && supported(transaction.getType()) && reversalId == null);
    }
}
