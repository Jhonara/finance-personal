package com.jr.finance.api.credit;

import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.credit.dto.CreateCreditRequest;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CreditService {

    private final CreditRepository creditRepository;
    private final UserRepository userRepository;

    public Credit create(Long userId, CreateCreditRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));

        Credit credit = new Credit();
        credit.setUser(user);
        credit.setName(req.getName());
        credit.setPrincipal(req.getPrincipal());
        credit.setAnnualRate(req.getAnnualRate());
        credit.setTermMonths(req.getTermMonths());
        credit.setDisbursementDate(req.getDisbursementDate());
        credit.setPaymentDay(req.getPaymentDay());
        credit.setCreatedAt(LocalDateTime.now());

        return creditRepository.save(credit);
    }

    public List<Credit> list(Long userId) {
        return creditRepository.findByUserId(userId);
    }

    public Credit findByIdForUser(Long userId, Long creditId) {
        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new NotFoundException("El crédito no existe"));

        if (!credit.getUser().getId().equals(userId)) {
            throw new NotFoundException("El crédito no existe");
        }

        return credit;
    }
}
