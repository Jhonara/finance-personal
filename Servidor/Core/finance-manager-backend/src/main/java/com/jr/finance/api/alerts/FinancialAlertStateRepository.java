package com.jr.finance.api.alerts;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface FinancialAlertStateRepository extends JpaRepository<FinancialAlertState, Long> {
    List<FinancialAlertState> findByUserId(Long userId);
}
