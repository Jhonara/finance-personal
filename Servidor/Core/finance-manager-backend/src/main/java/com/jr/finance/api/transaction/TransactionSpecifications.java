package com.jr.finance.api.transaction;

import com.jr.finance.api.ledger.FinancialTransaction;
import com.jr.finance.api.ledger.LedgerEntry;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Subquery;

final class TransactionSpecifications {
    private TransactionSpecifications() { }
    static Specification<FinancialTransaction> forQuery(Long userId, TransactionQuery query) {
        return (root, criteriaQuery, criteriaBuilder) -> {
            var predicate = criteriaBuilder.equal(root.get("user").get("id"), userId);
            if (query.from() != null) predicate = criteriaBuilder.and(predicate, criteriaBuilder.greaterThanOrEqualTo(root.get("effectiveDate"), query.from()));
            if (query.to() != null) predicate = criteriaBuilder.and(predicate, criteriaBuilder.lessThanOrEqualTo(root.get("effectiveDate"), query.to()));
            if (query.type() != null) predicate = criteriaBuilder.and(predicate, criteriaBuilder.equal(root.get("type"), query.type()));
            if (query.status() != null) predicate = criteriaBuilder.and(predicate, criteriaBuilder.equal(root.get("status"), query.status()));
            if (query.categoryId() != null) predicate = criteriaBuilder.and(predicate, criteriaBuilder.equal(root.get("category").get("id"), query.categoryId()));
            if (query.accountId() != null) {
                Subquery<Long> accounts = criteriaQuery.subquery(Long.class);
                var entry = accounts.from(LedgerEntry.class);
                accounts.select(entry.get("financialTransaction").get("id"));
                accounts.where(criteriaBuilder.equal(entry.get("account").get("id"), query.accountId()));
                predicate = criteriaBuilder.and(predicate, root.get("id").in(accounts));
            }
            return predicate;
        };
    }
}
