package com.jr.finance.api.credit;

import com.jr.finance.api.credit.dto.CreateCreditRequest;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import static org.assertj.core.api.Assertions.assertThat;

class CreditOpeningValidationTest {
    @Test
    void identifiesFutureOpeningDateWhenDeviceAndServerAreOnDifferentCalendarDays() {
        // Same instant: Oct 6 in UTC on the emulator, Oct 5 in Colombia on the server.
        var clock = Clock.fixed(Instant.parse("2026-10-06T02:30:00Z"), ZoneId.of("America/Bogota"));
        try (var factory = Validation.byDefaultProvider().configure()
                .clockProvider(() -> clock).buildValidatorFactory()) {
            var request = new CreateCreditRequest();
            request.setName("Prestamo");
            request.setCurrency("COP");
            request.setPrincipal(new BigDecimal("45000000"));
            request.setAnnualRate(new BigDecimal("8.4"));
            request.setTermMonths(240);
            request.setDisbursementDate(LocalDate.parse("2024-10-01"));
            request.setPaymentDay(5);
            request.setOpeningBalance(new BigDecimal("40000000"));
            request.setOpeningDate(LocalDate.parse("2026-10-06"));
            request.setOpeningRemainingMonths(200);
            request.setOpeningNextPaymentDate(LocalDate.parse("2026-10-07"));
            assertThat(factory.getValidator().validate(request))
                    .extracting(v -> v.getPropertyPath().toString()).containsExactly("openingDate");
            request.setOpeningDate(LocalDate.parse("2026-10-05"));
            assertThat(factory.getValidator().validate(request)).isEmpty();
        }
    }
}
