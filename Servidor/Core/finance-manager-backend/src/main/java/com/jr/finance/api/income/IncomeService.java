package com.jr.finance.api.income;

import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.income.dto.CreateIncomeRequest;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IncomeService {

    private final IncomeRepository incomeRepository;
    private final UserRepository userRepository;

    public Income create(Long userId, CreateIncomeRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Income i = new Income();
        i.setUser(user);
        i.setAmount(req.getAmount());
        i.setDescription(req.getDescription());
        i.setIncomeType(req.getIncomeType());
        i.setIncomeDate(req.getIncomeDate());

        return incomeRepository.save(i);
    }

    public List<Income> listByMonth(Long userId, int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        return incomeRepository.findByUserIdAndIncomeDateBetween(
                userId,
                ym.atDay(1),
                ym.atEndOfMonth()
        );
    }
}
