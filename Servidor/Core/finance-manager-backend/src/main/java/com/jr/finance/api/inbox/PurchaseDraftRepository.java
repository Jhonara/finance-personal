package com.jr.finance.api.inbox;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

public interface PurchaseDraftRepository extends JpaRepository<PurchaseDraft, Long> {
    Optional<PurchaseDraft> findByIdAndUserId(Long id, Long userId);
    Optional<PurchaseDraft> findByUserIdAndRequestKey(Long userId, String requestKey);
    Page<PurchaseDraft> findByUserIdAndStatusOrderByIdDesc(Long userId, String status, Pageable page);
    List<PurchaseDraft> findByUserIdAndStatusAndAmountAndCurrencyAndEffectiveDateBetween(
            Long userId, String status, BigDecimal amount, String currency, LocalDate from, LocalDate to);
}
