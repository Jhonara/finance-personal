package com.jr.finance.api.ledger;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {

    long countByFinancialTransactionId(Long financialTransactionId);

    @Query("""
            select entry from LedgerEntry entry
            join fetch entry.financialTransaction transaction
            left join fetch transaction.category
            where transaction.id = :financialTransactionId
            """)
    Optional<LedgerEntry> findByFinancialTransactionId(@Param("financialTransactionId") Long financialTransactionId);

    @Query("""
            select coalesce(sum(entry.signedAmount), 0)
            from LedgerEntry entry
            where entry.account.id = :accountId
              and entry.financialTransaction.status <> :voidedStatus
            """)
    BigDecimal sumPostedByAccountId(@Param("accountId") Long accountId,
                                    @Param("voidedStatus") FinancialTransactionStatus voidedStatus);

    @Query("""
            select coalesce(sum(entry.signedAmount), 0)
            from LedgerEntry entry
            where entry.financialTransaction.user.id = :userId
              and entry.financialTransaction.type = :type
              and entry.financialTransaction.status <> :voidedStatus
              and entry.financialTransaction.effectiveDate between :start and :end
            """)
    BigDecimal sumSignedByUserAndTypeAndPeriod(@Param("userId") Long userId,
                                                @Param("type") FinancialTransactionType type,
                                                @Param("start") LocalDate start,
                                                @Param("end") LocalDate end,
                                                @Param("voidedStatus") FinancialTransactionStatus voidedStatus);

    @Query("""
            select entry from LedgerEntry entry
            join fetch entry.financialTransaction transaction
            left join fetch transaction.category
            where transaction.user.id = :userId
              and transaction.type = :type
              and transaction.status <> :voidedStatus
              and transaction.effectiveDate between :start and :end
            """)
    List<LedgerEntry> findByUserTypeAndPeriod(@Param("userId") Long userId,
                                               @Param("type") FinancialTransactionType type,
                                               @Param("start") LocalDate start,
                                               @Param("end") LocalDate end,
                                               @Param("voidedStatus") FinancialTransactionStatus voidedStatus);
}
