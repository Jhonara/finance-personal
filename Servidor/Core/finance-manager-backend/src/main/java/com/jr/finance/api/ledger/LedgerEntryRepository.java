package com.jr.finance.api.ledger;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import com.jr.finance.api.budget.dto.BudgetCategorySpent;

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
            select entry from LedgerEntry entry
            join fetch entry.account
            where entry.financialTransaction.id = :financialTransactionId
            """)
    List<LedgerEntry> findAllByFinancialTransactionId(@Param("financialTransactionId") Long financialTransactionId);

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
            left join entry.financialTransaction.reversalOf original
            where entry.financialTransaction.user.id = :userId
              and (entry.financialTransaction.type = :type
                   or (entry.financialTransaction.type = :reversalType
                       and original.type = :type))
              and entry.financialTransaction.status <> :voidedStatus
              and entry.financialTransaction.effectiveDate between :start and :end
            """)
    BigDecimal sumSignedByUserAndTypeAndPeriod(@Param("userId") Long userId,
                                                @Param("type") FinancialTransactionType type,
                                                @Param("reversalType") FinancialTransactionType reversalType,
                                                @Param("start") LocalDate start,
                                                @Param("end") LocalDate end,
                                                @Param("voidedStatus") FinancialTransactionStatus voidedStatus);

    @Query("""
            select entry from LedgerEntry entry
            join fetch entry.financialTransaction transaction
            left join fetch transaction.category
            left join transaction.reversalOf original
            where transaction.user.id = :userId
              and (transaction.type = :type
                   or (transaction.type = :reversalType
                       and original.type = :type))
              and transaction.status <> :voidedStatus
              and transaction.effectiveDate between :start and :end
            """)
    List<LedgerEntry> findByUserTypeAndPeriod(@Param("userId") Long userId,
                                               @Param("type") FinancialTransactionType type,
                                               @Param("reversalType") FinancialTransactionType reversalType,
                                               @Param("start") LocalDate start,
                                               @Param("end") LocalDate end,
                                               @Param("voidedStatus") FinancialTransactionStatus voidedStatus);

    @Query("""
            select entry from LedgerEntry entry
            join fetch entry.account
            where entry.financialTransaction.id in :transactionIds
            """)
    List<LedgerEntry> findByFinancialTransactionIdInWithAccount(
            @Param("transactionIds") List<Long> transactionIds);

    @Query("""
            select transaction.category.id as categoryId, -sum(entry.signedAmount) as spentAmount
            from LedgerEntry entry
            join entry.financialTransaction transaction
            left join transaction.reversalOf original
            where transaction.user.id = :userId
              and transaction.category is not null
              and (transaction.type = :expenseType
                   or (transaction.type = :reversalType and original.type = :expenseType))
              and transaction.status <> :voidedStatus
              and transaction.effectiveDate between :start and :end
            group by transaction.category.id
            """)
    List<BudgetCategorySpent> sumSpentByCategoryForUserAndPeriod(
            @Param("userId") Long userId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end,
            @Param("expenseType") FinancialTransactionType expenseType,
            @Param("reversalType") FinancialTransactionType reversalType,
            @Param("voidedStatus") FinancialTransactionStatus voidedStatus);
}
