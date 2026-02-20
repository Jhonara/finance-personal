package com.jr.finance.api.credit;

import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.credit.dto.CreateCreditPaymentRequest;
import com.jr.finance.api.credit.dto.CreditStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CreditPaymentService {

    private final CreditRepository creditRepository;
    private final CreditPaymentRepository paymentRepository;

    public CreditStatusResponse registerPayment(Long userId, Long creditId, CreateCreditPaymentRequest req) {

        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new NotFoundException("El crédito no existe"));

        if (!credit.getUser().getId().equals(userId)) {
            throw new NotFoundException("El crédito no existe");
        }

        CreditPayment payment = new CreditPayment();
        payment.setCredit(credit);
        payment.setAmount(req.getAmount());
        payment.setPaymentDate(req.getPaymentDate());
        payment.setExtraPayment(req.getExtraPayment());

        paymentRepository.save(payment);

        return calculateRealStatus(credit);
    }

    public CreditStatusResponse calculateRealStatus(Credit credit) {

        List<CreditPayment> payments = paymentRepository.findByCreditIdOrderByPaymentDateAsc(credit.getId());

        BigDecimal totalPaid = BigDecimal.ZERO;
        BigDecimal totalExtra = BigDecimal.ZERO;

        for (CreditPayment p : payments) {
            totalPaid = totalPaid.add(p.getAmount());
            if (p.getExtraPayment() != null) {
                totalExtra = totalExtra.add(p.getExtraPayment());
            }
        }

        BigDecimal principalPaid = totalPaid.subtract(totalExtra).max(BigDecimal.ZERO);
        BigDecimal currentBalance = credit.getPrincipal().subtract(principalPaid).subtract(totalExtra).max(BigDecimal.ZERO);

        int paidInstallments = payments.size();
        int remainingInstallments = Math.max(credit.getTermMonths() - paidInstallments, 0);

        return new CreditStatusResponse(
                credit.getId(),
                credit.getPrincipal(),
                currentBalance.setScale(2, RoundingMode.HALF_UP),
                totalPaid.setScale(2, RoundingMode.HALF_UP),
                totalExtra.setScale(2, RoundingMode.HALF_UP),
                paidInstallments,
                remainingInstallments,
                payments.isEmpty() ? null : payments.get(payments.size() - 1).getPaymentDate()
        );
    }
}
