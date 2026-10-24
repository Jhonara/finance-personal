package com.jr.finance.api.inbox;

import com.jr.finance.api.ledger.LedgerEntry;
import com.jr.finance.api.ledger.FinancialTransaction;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface InboxMatchRepository extends JpaRepository<LedgerEntry, Long> {
    @Query("""
        select e from LedgerEntry e join fetch e.financialTransaction t join fetch e.account
        where t.user.id = :userId and t.status = com.jr.finance.api.ledger.FinancialTransactionStatus.POSTED
          and t.type in (com.jr.finance.api.ledger.FinancialTransactionType.EXPENSE,
                         com.jr.finance.api.ledger.FinancialTransactionType.INCOME,
                         com.jr.finance.api.ledger.FinancialTransactionType.TRANSFER,
                         com.jr.finance.api.ledger.FinancialTransactionType.CREDIT_PAYMENT)
          and t.currency = :currency and t.effectiveDate between :from and :to
          and abs(e.signedAmount) = :amount and (:accountId is null or e.account.id = :accountId)
        order by t.effectiveDate desc, t.id desc
        """)
    List<LedgerEntry> transactions(Long userId, String currency, BigDecimal amount, Long accountId,
            LocalDate from, LocalDate to);

    @Query("""
        select t from FinancialTransaction t join fetch t.category c
        where t.user.id = :userId and t.type = com.jr.finance.api.ledger.FinancialTransactionType.EXPENSE
          and t.status = com.jr.finance.api.ledger.FinancialTransactionStatus.POSTED
          and lower(trim(t.description)) = lower(:description) and c.active = true
        order by t.effectiveDate desc, t.id desc
        """)
    List<FinancialTransaction> categories(Long userId, String description, Pageable page);
}
