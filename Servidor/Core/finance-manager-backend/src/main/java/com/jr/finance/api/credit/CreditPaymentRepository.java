package com.jr.finance.api.credit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CreditPaymentRepository extends JpaRepository<CreditPayment, Long> {

    List<CreditPayment> findByCreditIdOrderByPaymentDateAsc(Long creditId);
}
