package com.jr.finance.api.credit;

import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.credit.dto.AmortizationRow;
import com.jr.finance.api.credit.dto.CreateCreditPaymentRequest;
import com.jr.finance.api.credit.dto.CreditPaymentResponse;
import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.common.exception.ConflictException;
import com.jr.finance.api.ledger.LedgerService;
import com.jr.finance.api.ledger.FinancialTransactionType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CreditPaymentService {
    private final CreditRepository creditRepository;
    private final CreditPaymentRepository paymentRepository;
    private final CreditSnapshotService snapshotService;
    private final CreditAmortizationService amortization;
    private final AccountRepository accountRepository;
    private final LedgerService ledgerService;

    /** amount is the whole cash payment; extraPrincipalAmount is a declared part of it. */
    @Transactional
    public CreditPaymentResponse registerPayment(Long userId, Long creditId, CreateCreditPaymentRequest request) {
        Credit credit = creditRepository.findWithLockByIdAndUserId(creditId, userId)
                .orElseThrow(() -> new NotFoundException("El crédito no existe"));
        if (request.getPaymentDate().isBefore(credit.getDisbursementDate()))
            throw new BadRequestException("La fecha de pago no puede ser anterior al desembolso");
        if (request.getPaymentDate().isAfter(LocalDate.now()))
            throw new BadRequestException("Los pagos futuros no representan hechos realizados");
        BigDecimal extra = request.getExtraPrincipalAmount() == null ? BigDecimal.ZERO : request.getExtraPrincipalAmount();
        if (extra.compareTo(request.getAmount()) > 0)
            throw new BadRequestException("El abono extra no puede superar el monto total pagado");

        CreditSnapshot before = snapshotService.snapshot(credit);
        if (before.remainingBalance().signum() == 0) throw new BadRequestException("El crédito ya está pagado");
        List<AmortizationRow> schedule = amortization.schedule(credit.getPrincipal(), credit.getAnnualRate(),
                credit.getTermMonths(), credit.getDisbursementDate(), credit.getPaymentDay(), null);
        int count = paymentRepository.findByCreditIdOrderByPaymentDateAsc(creditId).size();
        BigDecimal interestDue = schedule.stream().filter(row -> row.getInstallment() == count + 1)
                .findFirst().map(AmortizationRow::getInterest).orElse(BigDecimal.ZERO);
        BigDecimal normal = request.getAmount().subtract(extra);
        BigDecimal interest = normal.min(interestDue).setScale(2, RoundingMode.HALF_UP);
        BigDecimal principal = normal.subtract(interest).setScale(2, RoundingMode.HALF_UP);
        if (principal.add(extra).compareTo(before.remainingBalance()) > 0
                || request.getAmount().compareTo(interestDue.add(before.remainingBalance())) > 0)
            throw new BadRequestException("El pago excede el saldo pendiente del crédito");

        Account account = null;
        if (request.getAccountId() != null) {
            account = accountRepository.lockByIds(List.of(request.getAccountId())).stream().findFirst()
                    .filter(value -> value.getUser().getId().equals(userId))
                    .orElseThrow(() -> new NotFoundException("La cuenta no existe"));
            if (!account.isActive()) throw new BadRequestException("La cuenta está inactiva");
            if (!credit.getCurrency().equals(account.getCurrency())) throw new BadRequestException("La moneda del crédito no coincide con la cuenta");
        }

        CreditPayment payment = new CreditPayment();
        payment.setCredit(credit);
        payment.setPaymentDate(request.getPaymentDate());
        payment.setTotalAmount(request.getAmount().setScale(2, RoundingMode.HALF_UP));
        payment.setLegacyAmount(request.getAmount().setScale(2, RoundingMode.HALF_UP));
        payment.setInterestAmount(interest);
        payment.setPrincipalAmount(principal);
        payment.setExtraPrincipalAmount(extra.setScale(2, RoundingMode.HALF_UP));
        payment.setStatus(CreditPaymentStatus.POSTED);
        payment.setAccount(account);
        payment = paymentRepository.saveAndFlush(payment);
        if (account != null) {
            var transaction = ledgerService.recordCreditCashMovement(userId, account.getId(), FinancialTransactionType.CREDIT_PAYMENT,
                    payment.getTotalAmount(), payment.getPaymentDate(), credit.getCurrency(), "Pago de crédito #" + creditId);
            payment.setFinancialTransaction(transaction);
            payment = paymentRepository.saveAndFlush(payment);
        }

        CreditSnapshot after = snapshotService.snapshot(credit);
        return new CreditPaymentResponse(payment.getId(), payment.getTotalAmount(), payment.getInterestAmount(),
                payment.getPrincipalAmount(), payment.getExtraPrincipalAmount(), before.remainingBalance(),
                after.remainingBalance(), after.status(), after.nextPaymentDate(),
                account == null ? null : account.getId(), account == null ? null : account.getName(),
                payment.getFinancialTransaction() == null ? null : payment.getFinancialTransaction().getId(), payment.getStatus());
    }

    @Transactional
    public CreditPaymentResponse reverse(Long userId, Long creditId, Long paymentId) {
        Credit credit = creditRepository.findWithLockByIdAndUserId(creditId, userId)
                .orElseThrow(() -> new NotFoundException("El crédito no existe"));
        CreditPayment payment = paymentRepository.findById(paymentId)
                .filter(value -> value.getCredit().getId().equals(credit.getId()))
                .orElseThrow(() -> new NotFoundException("El pago no existe"));
        if (payment.getStatus() != CreditPaymentStatus.POSTED) throw new ConflictException("El pago ya fue revertido");
        CreditSnapshot before = snapshotService.snapshot(credit);
        if (payment.getFinancialTransaction() != null) ledgerService.reverseTransaction(payment.getFinancialTransaction().getId(), userId);
        payment.setStatus(CreditPaymentStatus.REVERSED);
        paymentRepository.saveAndFlush(payment);
        CreditSnapshot after = snapshotService.snapshot(credit);
        return new CreditPaymentResponse(payment.getId(), payment.getTotalAmount(), payment.getInterestAmount(),
                payment.getPrincipalAmount(), payment.getExtraPrincipalAmount(), before.remainingBalance(), after.remainingBalance(),
                after.status(), after.nextPaymentDate(), payment.getAccount() == null ? null : payment.getAccount().getId(),
                payment.getAccount() == null ? null : payment.getAccount().getName(),
                payment.getFinancialTransaction() == null ? null : payment.getFinancialTransaction().getId(), payment.getStatus());
    }
}
