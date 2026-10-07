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
    private final CreditPaymentRepository creditPayments;

    @org.springframework.transaction.annotation.Transactional
    public Credit create(Long userId, CreateCreditRequest req) {

        log.info("Creando crédito para el usuario con id: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Usuario con id {} no encontrado al crear un crédito.", userId);
                    return new NotFoundException("Usuario no encontrado");
                });

        validateOpening(req);
        Credit credit = new Credit();
        credit.setUser(user);
        credit.setName(req.getName());
        credit.setPrincipal(req.getPrincipal());
        credit.setAnnualRate(req.getAnnualRate());
        credit.setTermMonths(req.getTermMonths());
        credit.setDisbursementDate(req.getDisbursementDate());
        credit.setPaymentDay(req.getPaymentDay());
        credit.setCurrency(req.getCurrency());
        applyOpening(credit, req);

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

    private void validateOpening(CreateCreditRequest req) {
        boolean any = req.getOpeningBalance() != null || req.getOpeningDate() != null
                || req.getOpeningRemainingMonths() != null || req.getOpeningNextPaymentDate() != null;
        if (!any) return;
        if (req.getOpeningBalance() == null || req.getOpeningDate() == null
                || req.getOpeningRemainingMonths() == null || req.getOpeningNextPaymentDate() == null)
            throw new com.jr.finance.api.common.exception.BadRequestException("Completa el saldo, fecha de corte, cuotas restantes y próximo pago del extracto");
        if (req.getDisbursementAccountId() != null)
            throw new com.jr.finance.api.common.exception.BadRequestException("Un crédito existente no vuelve a ingresar el desembolso a una cuenta");
        if (req.getOpeningBalance().compareTo(req.getPrincipal()) > 0
                || req.getOpeningRemainingMonths() > req.getTermMonths()
                || req.getOpeningDate().isBefore(req.getDisbursementDate())
                || !req.getOpeningNextPaymentDate().isAfter(req.getOpeningDate()))
            throw new com.jr.finance.api.common.exception.BadRequestException("Revisa el saldo y las fechas del extracto: el próximo pago debe ser posterior al corte");
    }

    private void applyOpening(Credit credit, CreateCreditRequest req) {
        credit.setOpeningBalance(req.getOpeningBalance());
        credit.setOpeningDate(req.getOpeningDate());
        credit.setOpeningRemainingMonths(req.getOpeningRemainingMonths());
        credit.setOpeningNextPaymentDate(req.getOpeningNextPaymentDate());
    }

    @org.springframework.transaction.annotation.Transactional
    public Credit update(Long userId, Long id, com.jr.finance.api.credit.dto.UpdateCreditRequest req) {
        Credit credit = creditRepository.findWithLockByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("El crédito no existe"));
        if (!java.util.Objects.equals(credit.getVersion(), req.getVersion()))
            throw new com.jr.finance.api.common.exception.ConflictException("El crédito cambió. Vuelve a abrirlo antes de editar");
        if (credit.getDisbursementTransaction() != null || creditPayments.existsByCreditId(id))
            throw new com.jr.finance.api.common.exception.BadRequestException("Este crédito tiene movimientos vinculados. No se pueden reescribir sus condiciones ni su saldo inicial");
        validateOpening(req);
        if (req.getDisbursementAccountId() != null)
            throw new com.jr.finance.api.common.exception.BadRequestException("La edición no registra un nuevo desembolso");
        credit.setName(req.getName()); credit.setPrincipal(req.getPrincipal());
        credit.setAnnualRate(req.getAnnualRate()); credit.setTermMonths(req.getTermMonths());
        credit.setDisbursementDate(req.getDisbursementDate()); credit.setPaymentDay(req.getPaymentDay());
        credit.setCurrency(req.getCurrency()); applyOpening(credit, req);
        return creditRepository.saveAndFlush(credit);
    }

    @org.springframework.transaction.annotation.Transactional
    public void delete(Long userId, Long id) {
        Credit credit = creditRepository.findWithLockByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("El crédito no existe"));
        if (credit.getDisbursementTransaction() != null || creditPayments.existsByCreditId(id))
            throw new com.jr.finance.api.common.exception.BadRequestException("No puedes eliminar un crédito con historial de pagos o desembolso vinculado");
        creditRepository.delete(credit);
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
