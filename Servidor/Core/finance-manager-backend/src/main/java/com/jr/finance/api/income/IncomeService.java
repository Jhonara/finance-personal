package com.jr.finance.api.income;

import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.common.FinancialPeriod;
import com.jr.finance.api.income.dto.CreateIncomeRequest;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncomeService {

    private final IncomeRepository incomeRepository;
    private final UserRepository userRepository;

    public Income create(Long userId, CreateIncomeRequest req) {

        log.info("Creando ingreso para el usuario {}.", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Usuario con id {} no encontrado al crear un ingreso.", userId);
                    return new NotFoundException("Usuario no encontrado");
                });

        Income income = new Income();
        income.setUser(user);
        income.setAmount(req.getAmount());
        income.setDescription(req.getDescription());
        income.setIncomeType(req.getIncomeType());
        income.setIncomeDate(req.getIncomeDate());

        Income savedIncome = incomeRepository.save(income);

        log.info("Ingreso {} creado correctamente para el usuario {}.",
                savedIncome.getId(),
                userId);

        return savedIncome;
    }

    public List<Income> listByMonth(Long userId, int year, int month) {

        log.info("Consultando ingresos del usuario {} para {}/{}.",
                userId,
                month,
                year);

        var ym = FinancialPeriod.of(year, month);

        return incomeRepository.findByUserIdAndIncomeDateBetween(
                userId,
                ym.atDay(1),
                ym.atEndOfMonth()
        );
    }
}
