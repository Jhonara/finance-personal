package com.jr.finance.api.ledger;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {

    long countByFinancialTransactionId(Long financialTransactionId);

    @Query("""
            select coalesce(sum(entry.signedAmount), 0)
            from LedgerEntry entry
            where entry.account.id = :accountId
              and entry.financialTransaction.status <> :voidedStatus
            """)
    BigDecimal sumPostedByAccountId(@Param("accountId") Long accountId,
                                    @Param("voidedStatus") FinancialTransactionStatus voidedStatus);
}
