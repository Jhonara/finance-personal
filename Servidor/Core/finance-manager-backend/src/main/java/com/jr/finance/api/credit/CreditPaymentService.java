package com.jr.finance.api.credit;

import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.credit.dto.CreateCreditPaymentRequest;
import com.jr.finance.api.credit.dto.CreditStatusResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CreditPaymentService {

    private final CreditRepository creditRepository;
    private final CreditPaymentRepository paymentRepository;

    public CreditStatusResponse registerPayment(
            Long userId,
            Long creditId,
            CreateCreditPaymentRequest request
    ) {

        log.info("Registrando pago para el crédito {} del usuario {}.", creditId, userId);

        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> {
                    log.warn("Crédito {} no encontrado.", creditId);
                    return new NotFoundException("El crédito no existe");
                });

        if (!credit.getUser().getId().equals(userId)) {
            log.warn("El usuario {} intentó registrar un pago sobre el crédito {} sin permisos.",
                    userId,
                    creditId);

            throw new NotFoundException("El crédito no existe");
        }

        CreditPayment payment = new CreditPayment();
        payment.setCredit(credit);
        payment.setAmount(request.getAmount());
        payment.setPaymentDate(request.getPaymentDate());
        payment.setExtraPayment(request.getExtraPayment());

        paymentRepository.save(payment);

        log.info("Pago registrado correctamente para el crédito {}.", creditId);

        return calculateRealStatus(credit);
    }

    public CreditStatusResponse calculateRealStatus(Credit credit) {

        log.info("Calculando estado actual del crédito {}.", credit.getId());

        List<CreditPayment> payments =
                paymentRepository.findByCreditIdOrderByPaymentDateAsc(credit.getId());

        BigDecimal totalPaid = BigDecimal.ZERO;
        BigDecimal totalExtra = BigDecimal.ZERO;

        for (CreditPayment payment : payments) {

            totalPaid = totalPaid.add(payment.getAmount());

            if (payment.getExtraPayment() != null) {
                totalExtra = totalExtra.add(payment.getExtraPayment());
            }
        }

        BigDecimal principalPaid = totalPaid
                .subtract(totalExtra)
                .max(BigDecimal.ZERO);

        BigDecimal currentBalance = credit.getPrincipal()
                .subtract(principalPaid)
                .subtract(totalExtra)
                .max(BigDecimal.ZERO);

        int paidInstallments = payments.size();

        int remainingInstallments = Math.max(
                credit.getTermMonths() - paidInstallments,
                0
        );

        return new CreditStatusResponse(
                credit.getId(),
                credit.getPrincipal(),
                currentBalance.setScale(2, RoundingMode.HALF_UP),
                totalPaid.setScale(2, RoundingMode.HALF_UP),
                totalExtra.setScale(2, RoundingMode.HALF_UP),
                paidInstallments,
                remainingInstallments,
                payments.isEmpty()
                        ? null
                        : payments.get(payments.size() - 1).getPaymentDate()
        );
    }
}