package com.jr.finance.api.ledger;

import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.expense.Category;
import com.jr.finance.api.expense.CategoryRepository;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class LedgerService {

    private static final Pattern ISO_CURRENCY = Pattern.compile("[A-Z]{3}");

    private final FinancialTransactionRepository financialTransactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Transactional
    public FinancialTransaction recordIncome(Long userId, Long accountId, FinancialOperationCommand command) {
        return recordSingleEntry(userId, accountId, FinancialTransactionType.INCOME, command, true);
    }

    @Transactional
    public FinancialTransaction recordExpense(Long userId, Long accountId, FinancialOperationCommand command) {
        return recordSingleEntry(userId, accountId, FinancialTransactionType.EXPENSE, command, false);
    }

    @Transactional
    public FinancialTransaction recordOpeningBalance(Long userId, Long accountId, FinancialOperationCommand command) {
        validateCommand(command);
        if (command.categoryId() != null) {
            throw new BadRequestException("El saldo de apertura no puede tener categoría");
        }
        if (command.amount().compareTo(BigDecimal.ZERO) == 0) {
            throw new BadRequestException("El saldo de apertura no puede ser cero");
        }
        return persistSingleEntry(userId, accountId, FinancialTransactionType.OPENING_BALANCE, command,
                command.amount(), null);
    }

    public BigDecimal getAccountBalance(Long userId, Long accountId) {
        getOwnedAccount(userId, accountId);
        BigDecimal balance = ledgerEntryRepository.sumPostedByAccountId(accountId, FinancialTransactionStatus.VOIDED);
        return balance == null ? BigDecimal.ZERO : balance;
    }

    private FinancialTransaction recordSingleEntry(Long userId, Long accountId, FinancialTransactionType type,
                                                    FinancialOperationCommand command, boolean positive) {
        validateCommand(command);
        if (command.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("El monto debe ser mayor que 0");
        }
        Category category = resolveCategory(userId, command.categoryId());
        BigDecimal signedAmount = positive ? command.amount() : command.amount().negate();
        return persistSingleEntry(userId, accountId, type, command, signedAmount, category);
    }

    private FinancialTransaction persistSingleEntry(Long userId, Long accountId, FinancialTransactionType type,
                                                     FinancialOperationCommand command, BigDecimal signedAmount,
                                                     Category category) {
        Account account = getOwnedAccount(userId, accountId);
        if (!account.isActive()) {
            throw new BadRequestException("La cuenta está inactiva");
        }
        if (!account.getCurrency().equals(command.currency())) {
            throw new BadRequestException("La moneda de la transacción debe coincidir con la moneda de la cuenta");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("El usuario no existe"));

        FinancialTransaction transaction = new FinancialTransaction();
        transaction.setUser(user);
        transaction.setType(type);
        transaction.setStatus(FinancialTransactionStatus.POSTED);
        transaction.setEffectiveDate(command.effectiveDate());
        transaction.setDescription(normalizeDescription(command.description()));
        transaction.setCategory(category);
        transaction.setCurrency(command.currency());
        FinancialTransaction savedTransaction = financialTransactionRepository.saveAndFlush(transaction);

        LedgerEntry entry = new LedgerEntry();
        entry.setFinancialTransaction(savedTransaction);
        entry.setAccount(account);
        entry.setSignedAmount(signedAmount);
        ledgerEntryRepository.saveAndFlush(entry);
        return savedTransaction;
    }

    private Account getOwnedAccount(Long userId, Long accountId) {
        return accountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new NotFoundException("La cuenta no existe"));
    }

    private Category resolveCategory(Long userId, Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        return categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new NotFoundException("La categoría no existe"));
    }

    private void validateCommand(FinancialOperationCommand command) {
        if (command == null || command.amount() == null || command.effectiveDate() == null) {
            throw new BadRequestException("Monto y fecha efectiva son obligatorios");
        }
        if (command.currency() == null || !ISO_CURRENCY.matcher(command.currency()).matches()) {
            throw new BadRequestException("La moneda debe usar un código ISO-4217 de tres letras mayúsculas");
        }
    }

    private String normalizeDescription(String description) {
        if (description == null || description.trim().isEmpty()) {
            return null;
        }
        String normalized = description.trim();
        if (normalized.length() > 255) {
            throw new BadRequestException("La descripción no puede superar 255 caracteres");
        }
        return normalized;
    }
}
