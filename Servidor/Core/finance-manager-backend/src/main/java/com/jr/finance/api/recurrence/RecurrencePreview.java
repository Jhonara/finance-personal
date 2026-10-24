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
            if (!monthly && !twice)
                throw new BadRequestException("Para semanas o cada 14 días, indica el importe por pago: las fechas varían cada mes");
            try {
                payment = payment.divide(BigDecimal.valueOf(twice ? 2 : 1), 2, RoundingMode.UNNECESSARY);
            } catch (ArithmeticException exception) {
                throw new BadRequestException("El total debe dividirse en pagos iguales con hasta dos decimales. Ajusta el total o elige Por pago");
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
        return new Preview(payment, monthly || twice ? payment.multiply(BigDecimal.valueOf(twice ? 2 : 1)) : null, months);
    }
}
