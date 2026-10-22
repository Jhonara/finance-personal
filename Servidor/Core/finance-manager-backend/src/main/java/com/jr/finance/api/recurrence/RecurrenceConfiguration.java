package com.jr.finance.api.recurrence;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Clock;

@Configuration
public class RecurrenceConfiguration {
    @Bean public Clock recurrenceClock() { return Clock.systemUTC(); }
}
