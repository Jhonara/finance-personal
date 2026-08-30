package com.jr.finance.api.credit;

import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.credit.dto.CreateCreditRequest;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import com.jr.finance.api.ledger.LedgerService;
import com.jr.finance.api.ledger.FinancialTransactionType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CreditService {

    private final CreditRepository creditRepository;
    private final UserRepository userRepository;
    private final LedgerService ledgerService;

    @org.springframework.transaction.annotation.Transactional
    public Credit create(Long userId, CreateCreditRequest req) {

        log.info("Creando crédito para el usuario con id: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Usuario con id {} no encontrado al crear un crédito.", userId);
                    return new NotFoundException("Usuario no encontrado");
                });

        Credit credit = new Credit();
        credit.setUser(user);
        credit.setName(req.getName());
        credit.setPrincipal(req.getPrincipal());
        credit.setAnnualRate(req.getAnnualRate());
        credit.setTermMonths(req.getTermMonths());
        credit.setDisbursementDate(req.getDisbursementDate());
        credit.setPaymentDay(req.getPaymentDay());
        credit.setCurrency(req.getCurrency());

        Credit savedCredit = creditRepository.save(credit);
        if (req.getDisbursementAccountId() != null) {
            var transaction = ledgerService.recordCreditCashMovement(userId, req.getDisbursementAccountId(),
                    FinancialTransactionType.CREDIT_DISBURSEMENT, savedCredit.getPrincipal(),
                    savedCredit.getDisbursementDate(), savedCredit.getCurrency(), "Desembolso de crédito #" + savedCredit.getId());
            savedCredit.setDisbursementTransaction(transaction);
            savedCredit = creditRepository.save(savedCredit);
        }

        log.info("Crédito con id {} creado correctamente para el usuario {}.",
                savedCredit.getId(),
                userId);

        return savedCredit;
    }

    public List<Credit> list(Long userId) {

        log.info("Consultando créditos del usuario con id: {}", userId);

        return creditRepository.findByUserId(userId);
    }

    public Credit findByIdForUser(Long userId, Long creditId) {

        log.info("Consultando crédito {} para el usuario {}.", creditId, userId);

        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> {
                    log.warn("Crédito con id {} no encontrado.", creditId);
                    return new NotFoundException("El crédito no existe");
                });

        if (!credit.getUser().getId().equals(userId)) {
            log.warn("El usuario {} intentó acceder al crédito {} sin permisos.",
                    userId,
                    creditId);

            throw new NotFoundException("El crédito no existe");
        }

        return credit;
    }
}
