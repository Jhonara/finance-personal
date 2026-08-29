package com.jr.finance.api.account.mapper;

import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.dto.AccountResponse;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AccountMapper {

    public AccountResponse toResponse(Account account) {
        return new AccountResponse(
                account.getId(), account.getName(), account.getType(), account.getCurrency(), account.isActive(),
                account.getCreatedAt(), account.getUpdatedAt(), account.getVersion());
    }

    public List<AccountResponse> toResponseList(List<Account> accounts) {
        return accounts.stream().map(this::toResponse).toList();
    }
}
