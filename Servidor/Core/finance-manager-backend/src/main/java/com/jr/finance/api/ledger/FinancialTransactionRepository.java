package com.jr.finance.api.ledger;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.Optional;

public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select transaction from FinancialTransaction transaction
            join fetch transaction.user
            left join fetch transaction.category
            where transaction.id = :id and transaction.user.id = :userId
            """)
    Optional<FinancialTransaction> findOwnedForReversal(@Param("id") Long id, @Param("userId") Long userId);

    boolean existsByReversalOfId(Long reversalOfId);

    boolean existsByLegacySourceAndLegacyId(LegacyOperationSource legacySource, Long legacyId);

    Optional<FinancialTransaction> findByLegacySourceAndLegacyIdAndUserId(
            LegacyOperationSource legacySource, Long legacyId, Long userId);
}
