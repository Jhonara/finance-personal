package com.jr.finance.api.ledger;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Opt-in operational entrypoint; disabled unless legacy.migration.enabled=true is supplied. */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "legacy.migration.enabled", havingValue = "true")
public class LegacyMigrationRunner implements ApplicationRunner {
    private final LegacyLedgerMigrationService migrationService;

    @Value("${legacy.migration.mode:DRY_RUN}")
    private String mode;

    @Value("${legacy.migration.batch-size:500}")
    private int batchSize;

    @Override
    public void run(ApplicationArguments args) {
        LegacyMigrationReport report = "APPLY".equalsIgnoreCase(mode)
                ? migrationService.migrate(batchSize) : migrationService.dryRun();
        log.warn("Legacy ledger migration {} completed: {}", mode, report);
    }
}
