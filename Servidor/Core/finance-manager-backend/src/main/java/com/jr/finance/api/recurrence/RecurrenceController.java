package com.jr.finance.api.recurrence;

import com.jr.finance.api.auth.UserPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import static com.jr.finance.api.recurrence.RecurrenceDtos.*;

@RestController @RequestMapping("/api/v1/recurrences") @RequiredArgsConstructor
@Tag(name = "Recurrences", description = "Ingresos y gastos recurrentes. Solo lo registrado afecta cuentas y reportes; no realiza pagos bancarios.")
public class RecurrenceController {
    private final RecurrenceService service;
    private Long user(Authentication authentication) { return ((UserPrincipal) authentication.getPrincipal()).getUser().getId(); }
    @GetMapping @Operation(operationId = "listRecurringRules")
    public List<Rule> list(Authentication auth) { return service.list(user(auth)); }
    @PostMapping("/preview") @Operation(operationId = "previewRecurringRule", description = "Vista previa sin guardar ni registrar movimientos.")
    public Preview preview(@Valid @RequestBody PreviewRequest request) { return RecurrencePreview.calculate(request); }
    @GetMapping("/upcoming") @Operation(operationId = "getUpcomingRecurringEntries")
    public Upcoming upcoming(Authentication auth, @RequestParam(defaultValue = "America/Bogota") String timeZone) {
        return service.upcoming(user(auth), timeZone);
    }
    @GetMapping("/agenda") public Agenda agenda(Authentication auth, @RequestParam int year, @RequestParam int month) {
        return service.agenda(user(auth), year, month);
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "createRecurringRule")
    public Rule create(Authentication auth, @Valid @RequestBody SaveRule request) { return service.create(user(auth), request); }
    @PutMapping("/{id}")
    @Operation(operationId = "updateRecurringRule")
    public Rule update(Authentication auth, @PathVariable Long id, @Valid @RequestBody SaveRule request) {
        return service.update(user(auth), id, request);
    }
    @PatchMapping("/{id}/active")
    public Rule active(Authentication auth, @PathVariable Long id, @Valid @RequestBody SetActive request) {
        return service.setActive(user(auth), id, request);
    }
    @PostMapping("/{id}/occurrences/{date}/confirm")
    public Entry confirm(Authentication auth, @PathVariable Long id, @PathVariable LocalDate date, @Valid @RequestBody Confirm request) {
        return service.confirm(user(auth), id, date, request);
    }
    @PostMapping("/{id}/occurrences/{date}/skip")
    public Entry skip(Authentication auth, @PathVariable Long id, @PathVariable LocalDate date) {
        return service.skip(user(auth), id, date);
    }
}
