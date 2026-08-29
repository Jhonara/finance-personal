package com.jr.finance.api.account;

import com.jr.finance.api.account.dto.CreateAccountRequest;
import com.jr.finance.api.account.dto.UpdateAccountRequest;
import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.ConflictException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    @Transactional
    public Account create(Long userId, CreateAccountRequest request) {
        String name = normalizeName(request.getName());
        if (accountRepository.existsByUserIdAndName(userId, name)) {
            throw new ConflictException("Ya existe una cuenta con ese nombre");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("El usuario no existe"));

        Account account = new Account();
        account.setUser(user);
        account.setName(name);
        account.setType(request.getType());
        account.setCurrency(request.getCurrency());
        account.setActive(true);
        return accountRepository.saveAndFlush(account);
    }

    public List<Account> list(Long userId, Boolean active) {
        return active == null
                ? accountRepository.findByUserIdOrderByActiveDescNameAsc(userId)
                : accountRepository.findByUserIdAndActiveOrderByNameAsc(userId, active);
    }

    public Account get(Long userId, Long accountId) {
        return accountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new NotFoundException("La cuenta no existe"));
    }

    @Transactional
    public Account update(Long userId, Long accountId, UpdateAccountRequest request) {
        Account account = get(userId, accountId);
        if (!account.getVersion().equals(request.getVersion())) {
            throw new ConflictException("La cuenta fue modificada por otra operación. Intenta nuevamente.");
        }
        if (request.getName() == null && request.getType() == null && request.getActive() == null) {
            throw new BadRequestException("Debes enviar al menos un campo editable");
        }

        if (request.getName() != null) {
            String name = normalizeName(request.getName());
            if (accountRepository.existsByUserIdAndNameAndIdNot(userId, name, accountId)) {
                throw new ConflictException("Ya existe una cuenta con ese nombre");
            }
            account.setName(name);
        }
        if (request.getType() != null) {
            account.setType(request.getType());
        }
        if (request.getActive() != null) {
            account.setActive(request.getActive());
        }

        return accountRepository.saveAndFlush(account);
    }

    private String normalizeName(String name) {
        String normalized = name == null ? "" : name.trim();
        if (normalized.length() < 2 || normalized.length() > 100) {
            throw new BadRequestException("El nombre de la cuenta debe tener entre 2 y 100 caracteres");
        }
        return normalized;
    }
}
