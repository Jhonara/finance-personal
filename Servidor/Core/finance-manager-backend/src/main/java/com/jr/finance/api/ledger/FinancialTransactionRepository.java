package com.jr.finance.api.ledger;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, Long> {
}
