package com.jr.finance.api.account;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;

public interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findByUserIdOrderByActiveDescNameAsc(Long userId);

    List<Account> findByUserIdAndActiveOrderByNameAsc(Long userId, boolean active);

    Optional<Account> findByIdAndUserId(Long id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Account a where a.id = :accountId and a.user.id = :userId")
    Optional<Account> findByIdAndUserIdForUpdate(Long accountId, Long userId);

    boolean existsByUserIdAndName(Long userId, String name);

    boolean existsByUserIdAndNameAndIdNot(Long userId, String name, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Account a where a.id in :ids order by a.id")
    List<Account> lockByIds(List<Long> ids);

    @Query("""
            select a.id, a.name, a.type, a.currency, a.active, coalesce(sum(e.signedAmount), 0)
            from Account a left join LedgerEntry e on e.account = a
            left join e.financialTransaction t on t.status <> com.jr.finance.api.ledger.FinancialTransactionStatus.VOIDED
            where a.user.id = :userId
            group by a.id, a.name, a.type, a.currency, a.active
            order by a.name
            """)
    List<Object[]> findDashboardBalancesByUserId(Long userId);
}
