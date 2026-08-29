package com.jr.finance.api.dashboard.dto;
import com.jr.finance.api.account.AccountType;
import lombok.AllArgsConstructor; import lombok.Data;
import java.math.BigDecimal;
@Data @AllArgsConstructor
public class DashboardAccountResponse { private Long id; private String name; private AccountType type; private String currency; private boolean active; private BigDecimal balance; }
