package com.jr.finance.api.ledger;

import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.ConflictException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.expense.Category;
import com.jr.finance.api.expense.CategoryRepository;
import com.jr.finance.api.expense.CategoryType;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
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
        return recordIncome(userId, accountId, command, null);
    }

    @Transactional
    public FinancialTransaction recordIncome(Long userId, Long accountId, FinancialOperationCommand command,
                                             String incomeType) {
        return recordSingleEntry(userId, accountId, FinancialTransactionType.INCOME, command, true,
                incomeType, null, null);
    }

    @Transactional
    public FinancialTransaction recordExpense(Long userId, Long accountId, FinancialOperationCommand command) {
        return recordExpense(userId, accountId, command, null, null);
    }

    @Transactional
    public FinancialTransaction recordExpense(Long userId, Long accountId, FinancialOperationCommand command,
                                              String paymentType, String expenseType) {
        return recordSingleEntry(userId, accountId, FinancialTransactionType.EXPENSE, command, false,
                null, paymentType, expenseType);
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
        Account account = accountRepository.findByIdAndUserIdForUpdate(accountId, userId)
                .orElseThrow(() -> new NotFoundException("La cuenta no existe"));
        if (!account.isActive()) {
            throw new BadRequestException("La cuenta está inactiva");
        }
        if (financialTransactionRepository.existsOpeningBalanceForAccountId(accountId)) {
            throw new ConflictException("La cuenta ya tiene un saldo de apertura");
        }
        return persistSingleEntry(userId, accountId, FinancialTransactionType.OPENING_BALANCE, command,
                command.amount(), null, null, null, null);
    }

    public BigDecimal getAccountBalance(Long userId, Long accountId) {
        getOwnedAccount(userId, accountId);
        BigDecimal balance = ledgerEntryRepository.sumPostedByAccountId(accountId, FinancialTransactionStatus.VOIDED);
        return balance == null ? BigDecimal.ZERO : balance;
    }

    /** Records a real cash movement which is intentionally outside ordinary income/expense. */
    @Transactional
    public FinancialTransaction recordCreditCashMovement(Long userId, Long accountId, FinancialTransactionType type,
                                                          BigDecimal amount, LocalDate date, String currency,
                                                          String description) {
        if (type != FinancialTransactionType.CREDIT_DISBURSEMENT && type != FinancialTransactionType.CREDIT_PAYMENT)
            throw new IllegalArgumentException("Tipo de movimiento de crédito inválido");
        Account account = getOwnedAccount(userId, accountId);
        if (!account.isActive()) throw new BadRequestException("La cuenta está inactiva");
        if (!account.getCurrency().equals(currency)) throw new BadRequestException("La moneda del crédito no coincide con la cuenta");
        if (type == FinancialTransactionType.CREDIT_PAYMENT && getAccountBalance(userId, accountId).compareTo(amount) < 0)
            throw new BadRequestException("Saldo insuficiente");
        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("El usuario no existe"));
        FinancialTransaction transaction = new FinancialTransaction();
        transaction.setUser(user); transaction.setType(type); transaction.setStatus(FinancialTransactionStatus.POSTED);
        transaction.setEffectiveDate(date); transaction.setCurrency(currency); transaction.setDescription(normalizeDescription(description));
        transaction = financialTransactionRepository.saveAndFlush(transaction);
        LedgerEntry entry = new LedgerEntry(); entry.setFinancialTransaction(transaction); entry.setAccount(account);
        entry.setSignedAmount(type == FinancialTransactionType.CREDIT_DISBURSEMENT ? amount : amount.negate());
        ledgerEntryRepository.saveAndFlush(entry);
        return transaction;
    }

    /**
     * Creates the accounting opposite of a posted operation.  The reversal is deliberately
     * dated today: reports retain the original event in its historical period and record the
     * correction in the period where the user made it.
     */
    @Transactional
    public FinancialTransaction reverseTransaction(Long transactionId, Long userId) {
        FinancialTransaction original = financialTransactionRepository.findOwnedForReversal(transactionId, userId)
                .orElseThrow(() -> new NotFoundException("La operación no existe"));
        if (original.getType() == FinancialTransactionType.REVERSAL) {
            throw new BadRequestException("No se puede revertir una reversión");
        }
        if (original.getStatus() != FinancialTransactionStatus.POSTED) {
            throw new ConflictException("La operación ya no puede revertirse");
        }
        if (financialTransactionRepository.existsByReversalOfId(original.getId())) {
            throw new ConflictException("La operación ya fue revertida");
        }

        List<LedgerEntry> originalEntries = ledgerEntryRepository.findAllByFinancialTransactionId(original.getId());
        if (originalEntries.isEmpty()) {
            throw new ConflictException("La operación no tiene entradas para revertir");
        }

        FinancialTransaction reversal = new FinancialTransaction();
        reversal.setUser(original.getUser());
        reversal.setType(FinancialTransactionType.REVERSAL);
        reversal.setStatus(FinancialTransactionStatus.POSTED);
        reversal.setEffectiveDate(LocalDate.now());
        reversal.setDescription("Reversión de operación #" + original.getId());
        reversal.setCategory(original.getCategory());
        reversal.setCurrency(original.getCurrency());
        reversal.setIncomeType(original.getIncomeType());
        reversal.setPaymentType(original.getPaymentType());
        reversal.setExpenseType(original.getExpenseType());
        reversal.setReversalOf(original);
        FinancialTransaction savedReversal = financialTransactionRepository.saveAndFlush(reversal);

        List<LedgerEntry> reversalEntries = originalEntries.stream().map(originalEntry -> {
            LedgerEntry entry = new LedgerEntry();
            entry.setFinancialTransaction(savedReversal);
            entry.setAccount(originalEntry.getAccount());
            entry.setSignedAmount(originalEntry.getSignedAmount().negate());
            return entry;
        }).toList();
        ledgerEntryRepository.saveAllAndFlush(reversalEntries);

        original.setStatus(FinancialTransactionStatus.REVERSED);
        financialTransactionRepository.saveAndFlush(original);
        return savedReversal;
    }

    private FinancialTransaction recordSingleEntry(Long userId, Long accountId, FinancialTransactionType type,
                                                    FinancialOperationCommand command, boolean positive,
                                                    String incomeType, String paymentType, String expenseType) {
        validateCommand(command);
        if (command.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("El monto debe ser mayor que 0");
        }
        CategoryType expectedCategoryType = type == FinancialTransactionType.INCOME
                ? CategoryType.INCOME : CategoryType.EXPENSE;
        Category category = resolveCategory(userId, command.categoryId(), expectedCategoryType);
        BigDecimal signedAmount = positive ? command.amount() : command.amount().negate();
        return persistSingleEntry(userId, accountId, type, command, signedAmount, category,
                incomeType, paymentType, expenseType);
    }

    private FinancialTransaction persistSingleEntry(Long userId, Long accountId, FinancialTransactionType type,
                                                     FinancialOperationCommand command, BigDecimal signedAmount,
                                                     Category category, String incomeType, String paymentType,
                                                     String expenseType) {
        Account account = getOwnedAccount(userId, accountId);
        if (!account.isActive()) {
            throw new BadRequestException("La cuenta está inactiva");
        }
        String currency = command.currency() == null ? account.getCurrency() : command.currency();
        if (!account.getCurrency().equals(currency)) {
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
        transaction.setCurrency(currency);
        transaction.setIncomeType(incomeType);
        transaction.setPaymentType(paymentType);
        transaction.setExpenseType(expenseType);
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

    private Category resolveCategory(Long userId, Long categoryId, CategoryType expectedType) {
        if (categoryId == null) {
            return null;
        }
        Category category = categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new NotFoundException("La categoría no existe"));
        if (category.getType() != expectedType) {
            throw new BadRequestException("La categoría no corresponde al tipo de operación");
        }
        if (!category.isActive()) {
            throw new BadRequestException("La categoría está inactiva");
        }
        return category;
    }

    private void validateCommand(FinancialOperationCommand command) {
        if (command == null || command.amount() == null || command.effectiveDate() == null) {
            throw new BadRequestException("Monto y fecha efectiva son obligatorios");
        }
        if (command.currency() != null && !ISO_CURRENCY.matcher(command.currency()).matches()) {
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
