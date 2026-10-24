package com.jr.finance.api.recurrence;

import com.jr.finance.api.common.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.*;
import static com.jr.finance.api.recurrence.RecurrenceDtos.*;

class RecurrencePreviewTest {
    PreviewRequest request(RecurrenceFrequency frequency, AmountBasis basis, String amount, String start, String end) {
        return new PreviewRequest(frequency, basis, new BigDecimal(amount), LocalDate.parse(start),
                end == null ? null : LocalDate.parse(end), frequency == RecurrenceFrequency.MONTHLY ? 31 : 15, 31);
    }
    @Test void splitsMonthlySalaryAndDoesNotBackfillTheFirstMonth() {
        var result = RecurrencePreview.calculate(request(RecurrenceFrequency.SEMIMONTHLY, AmountBasis.MONTHLY_TOTAL,
                "3000000", "2026-10-21", null));
        assertThat(result.amountPerPayment()).isEqualByComparingTo("1500000");
        assertThat(result.fullMonthTotal()).isEqualByComparingTo("3000000");
        assertThat(result.months().getFirst().dates()).containsExactly(LocalDate.of(2026,10,31));
        assertThat(result.months().getFirst().total()).isEqualByComparingTo("1500000");
        assertThat(result.months().get(1).dates()).containsExactly(LocalDate.of(2026,11,15), LocalDate.of(2026,11,30));
    }
    @Test void preservesExistingPerPaymentAmountsAndHonorsLeapMonthAndEnd() {
        var result = RecurrencePreview.calculate(request(RecurrenceFrequency.MONTHLY, AmountBasis.PER_PAYMENT,
                "100.25", "2028-02-01", "2028-02-29"));
        assertThat(result.amountPerPayment()).isEqualByComparingTo("100.25");
        assertThat(result.months().getFirst().dates()).containsExactly(LocalDate.of(2028,2,29));
        assertThat(result.months().get(1).dates()).isEmpty();
    }
    @Test void weeksUseActualOccurrencesInsteadOfAssumingFourPayments() {
        var result = RecurrencePreview.calculate(request(RecurrenceFrequency.WEEKLY, AmountBasis.PER_PAYMENT,
                "100", "2026-10-02", null));
        assertThat(result.fullMonthTotal()).isNull();
        assertThat(result.months().getFirst().total()).isEqualByComparingTo("500");
        assertThat(result.months().get(1).total()).isEqualByComparingTo("400");
        assertThatThrownBy(() -> RecurrencePreview.calculate(request(RecurrenceFrequency.BIWEEKLY,
                AmountBasis.MONTHLY_TOTAL,"100","2026-10-02",null))).isInstanceOf(BadRequestException.class);
    }
    @Test void refusesSilentRoundingOfAnIndivisibleTotal() {
        assertThatThrownBy(() -> RecurrencePreview.calculate(request(RecurrenceFrequency.SEMIMONTHLY,
                AmountBasis.MONTHLY_TOTAL,"100.01","2026-10-02",null))).isInstanceOf(BadRequestException.class);
    }
}
