package com.jr.finance.api.ledger;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;

public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, Long>, JpaSpecificationExecutor<FinancialTransaction> {

    @Override
    @EntityGraph(attributePaths = {"category", "reversalOf"})
    Page<FinancialTransaction> findAll(Specification<FinancialTransaction> specification, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select transaction from FinancialTransaction transaction
            join fetch transaction.user
            left join fetch transaction.category
            where transaction.id = :id and transaction.user.id = :userId
            """)
    Optional<FinancialTransaction> findOwnedForReversal(@Param("id") Long id, @Param("userId") Long userId);

    boolean existsByReversalOfId(Long reversalOfId);

    @Query("""
            select case when count(transaction) > 0 then true else false end
            from FinancialTransaction transaction
            join LedgerEntry entry on entry.financialTransaction = transaction
            where entry.account.id = :accountId
              and transaction.type = com.jr.finance.api.ledger.FinancialTransactionType.OPENING_BALANCE
            """)
    boolean existsOpeningBalanceForAccountId(@Param("accountId") Long accountId);

    boolean existsByLegacySourceAndLegacyId(LegacyOperationSource legacySource, Long legacyId);

    Optional<FinancialTransaction> findByLegacySourceAndLegacyIdAndUserId(
            LegacyOperationSource legacySource, Long legacyId, Long userId);

    @Query("""
            select transaction.id from FinancialTransaction transaction
            where transaction.user.id = :userId
              and transaction.effectiveDate between :start and :end
            order by transaction.effectiveDate desc, transaction.createdAt desc, transaction.id desc
            """)
    List<Long> findRecentIdsByUserAndPeriod(@Param("userId") Long userId,
                                            @Param("start") LocalDate start,
                                            @Param("end") LocalDate end,
                                            Pageable pageable);

    @Query("""
            select transaction from FinancialTransaction transaction
            left join fetch transaction.category
            left join fetch transaction.reversalOf
            where transaction.user.id = :userId and transaction.id in :ids
            """)
    List<FinancialTransaction> findDashboardTransactionsByUserIdAndIdIn(
            @Param("userId") Long userId, @Param("ids") List<Long> ids);
}
