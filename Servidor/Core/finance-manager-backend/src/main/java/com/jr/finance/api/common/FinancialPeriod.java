package com.jr.finance.api.common;

import com.jr.finance.api.common.exception.BadRequestException;

import java.time.YearMonth;

/**
 * Centralizes the externally accepted financial reporting period.
 *
 * The range is deliberately finite so malformed or accidental values do not
 * reach date calculations or persistence queries.
 */
public final class FinancialPeriod {

    public static final int MIN_YEAR = 2000;
    public static final int MAX_YEAR = 2100;

    private FinancialPeriod() {
    }

    public static YearMonth of(int year, int month) {
        if (year < MIN_YEAR || year > MAX_YEAR) {
            throw new BadRequestException("El año debe estar entre " + MIN_YEAR + " y " + MAX_YEAR);
        }
        if (month < 1 || month > 12) {
            throw new BadRequestException("El mes debe estar entre 1 y 12");
        }
        return YearMonth.of(year, month);
    }
}
