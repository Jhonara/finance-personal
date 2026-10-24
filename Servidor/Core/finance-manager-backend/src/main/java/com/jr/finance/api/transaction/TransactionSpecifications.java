package com.jr.finance.api.transaction;

import com.jr.finance.api.ledger.FinancialTransaction;
import com.jr.finance.api.ledger.LedgerEntry;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Subquery;
import jakarta.persistence.criteria.JoinType;
import com.jr.finance.api.ledger.FinancialTransactionType;
import com.jr.finance.api.ledger.FinancialTransactionStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import java.text.Normalizer;
import java.util.Locale;

final class TransactionSpecifications {
    private TransactionSpecifications() { }
    static Specification<FinancialTransaction> forQuery(Long userId, TransactionQuery query) {
        return (root, criteriaQuery, criteriaBuilder) -> {
            var predicate = criteriaBuilder.equal(root.get("user").get("id"), userId);
            if (query.searchText() != null && !query.searchText().isBlank()) {
                var category = root.join("category", JoinType.LEFT);
                var original = root.join("reversalOf", JoinType.LEFT);
                var originalCategory = original.join("category", JoinType.LEFT);
                String normalized = Normalizer.normalize(query.searchText().strip(), Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
                for (String word : normalized.split("\\s+")) {
                    String pattern = "%" + word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                    // EXISTS keeps transfers as one row even when both accounts match.
                    Subquery<Long> matchingAccount = criteriaQuery.subquery(Long.class);
                    var entry = matchingAccount.from(LedgerEntry.class);
                    matchingAccount.select(entry.get("financialTransaction").get("id"));
                    matchingAccount.where(criteriaBuilder.equal(entry.get("financialTransaction"), root),
                            criteriaBuilder.like(searchable(criteriaBuilder, entry.get("account").get("name")), pattern, '\\'));
                    predicate = criteriaBuilder.and(predicate, criteriaBuilder.or(
                            criteriaBuilder.like(searchable(criteriaBuilder, root.get("description")), pattern, '\\'),
                            criteriaBuilder.like(searchable(criteriaBuilder, category.get("name")), pattern, '\\'),
                            criteriaBuilder.like(searchable(criteriaBuilder, original.get("description")), pattern, '\\'),
                            criteriaBuilder.like(searchable(criteriaBuilder, originalCategory.get("name")), pattern, '\\'),
                            criteriaBuilder.exists(matchingAccount)));
                }
            }
            if (query.currency() != null) predicate = criteriaBuilder.and(predicate, criteriaBuilder.equal(root.get("currency"), query.currency()));
            if (query.expenseReport()) {
                var original = root.join("reversalOf", JoinType.LEFT);
                var reversal = criteriaBuilder.equal(root.get("type"), FinancialTransactionType.REVERSAL);
                predicate = criteriaBuilder.and(predicate,
                        criteriaBuilder.notEqual(root.get("status"), FinancialTransactionStatus.VOIDED),
                        criteriaBuilder.or(criteriaBuilder.equal(root.get("type"), FinancialTransactionType.EXPENSE),
                                criteriaBuilder.and(reversal, criteriaBuilder.equal(original.get("type"), FinancialTransactionType.EXPENSE))));
                if (query.reportCategory() != null) {
                    var category = root.join("category", JoinType.LEFT);
                    var originalCategory = original.join("category", JoinType.LEFT);
                    var name = criteriaBuilder.<String>selectCase().when(reversal,
                            criteriaBuilder.coalesce(originalCategory.<String>get("name"), "Sin categoría"))
                            .otherwise(criteriaBuilder.coalesce(category.<String>get("name"), "Sin categoría"));
                    predicate = criteriaBuilder.and(predicate, criteriaBuilder.equal(name, query.reportCategory()));
                }
            }
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
    private static Expression<String> searchable(CriteriaBuilder builder, Expression<String> value) {
        return builder.function("translate", String.class, builder.lower(builder.coalesce(value, "")),
                builder.literal("áéíóúüñ"), builder.literal("aeiouun"));
    }
}
