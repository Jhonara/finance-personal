package com.jr.finance.api.recurrence;

import com.jr.finance.api.common.exception.BadRequestException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import static com.jr.finance.api.recurrence.RecurrenceDtos.*;

/** Read-only illustration using the same calendar as the posting worker. */
public final class RecurrencePreview {
    private RecurrencePreview() {}
    public static Preview calculate(PreviewRequest request) {
        boolean monthly = request.frequency() == RecurrenceFrequency.MONTHLY;
        boolean twice = request.frequency() == RecurrenceFrequency.SEMIMONTHLY;
        if (request.startDate().getYear() < 2000 || request.startDate().getYear() > 2100
                || (request.endDate() != null && (request.endDate().isBefore(request.startDate())
                || request.endDate().getYear() > 2100)))
            throw new BadRequestException("Revisa las fechas de inicio y fin");
        if (twice && (request.firstDay() > 27 || request.secondDay() == null
                || request.secondDay() <= request.firstDay()))
            throw new BadRequestException("El primer día debe estar entre 1 y 27 y el segundo debe ser posterior");
        BigDecimal payment = request.amount();
        if (request.amountBasis() == AmountBasis.MONTHLY_TOTAL) {
            int paymentsPerYear = switch (request.frequency()) {
                case MONTHLY -> 12;
                case SEMIMONTHLY -> 24;
                case WEEKLY -> 52;
                case BIWEEKLY -> 26;
            };
            try {
                payment = request.amount().multiply(BigDecimal.valueOf(12))
                        .divide(BigDecimal.valueOf(paymentsPerYear), 4,
                                monthly || twice ? RoundingMode.UNNECESSARY : RoundingMode.HALF_UP);
            } catch (ArithmeticException exception) {
                throw new BadRequestException("El total mensual debe repartirse en pagos iguales con hasta cuatro decimales");
            }
        }
        List<PreviewMonth> months = new ArrayList<>();
        YearMonth firstMonth = YearMonth.from(request.startDate());
        for (int i = 0; i < 2; i++) {
            YearMonth month = firstMonth.plusMonths(i);
            List<LocalDate> dates = new ArrayList<>();
            LocalDate date = RecurrenceDates.onOrAfter(request.frequency(), request.startDate(),
                    request.firstDay(), request.secondDay(), month.atDay(1));
            while (!date.isAfter(month.atEndOfMonth()) && (request.endDate() == null || !date.isAfter(request.endDate()))) {
                dates.add(date);
                date = RecurrenceDates.onOrAfter(request.frequency(), request.startDate(),
                        request.firstDay(), request.secondDay(), date.plusDays(1));
            }
            months.add(new PreviewMonth(month.atDay(1), dates, payment.multiply(BigDecimal.valueOf(dates.size()))));
        }
        BigDecimal fullMonthTotal = request.amountBasis() == AmountBasis.MONTHLY_TOTAL
                ? request.amount()
                : monthly || twice ? payment.multiply(BigDecimal.valueOf(twice ? 2 : 1)) : null;
        return new Preview(payment, fullMonthTotal, months);
    }
}
