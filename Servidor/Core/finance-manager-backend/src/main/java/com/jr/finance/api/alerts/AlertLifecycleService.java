package com.jr.finance.api.alerts;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jr.finance.api.alerts.dto.*;
import com.jr.finance.api.common.exception.*;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class AlertLifecycleService {
    private final AlertService signals;
    private final FinancialAlertStateRepository states;
    private final UserRepository users;
    private final ObjectMapper mapper;
    private final Clock recurrenceClock;
    // Same financial calendar used by this deployment; independent of the host's timezone.
    static final ZoneId ZONE = ZoneId.of("America/Bogota");

    @Transactional
    public List<AlertResponse> list(Long userId, boolean history) {
        var rows = synchronize(userId);
        var result = rows.stream().filter(row -> active(row) != history)
                .sorted(history ? Comparator.comparing(FinancialAlertState::getClosedAt,
                        Comparator.nullsLast(Comparator.reverseOrder()))
                        : Comparator.comparingInt((FinancialAlertState row) -> snapshot(row).getScore()).reversed())
                .limit(history ? 30 : Long.MAX_VALUE).map(this::response).toList();
        if (!history && result.isEmpty()) return List.of(new AlertResponse("ALL_GOOD", "INFO", 0,
                "No encontramos avisos pendientes con los datos registrados.", Map.of()));
        return result;
    }

    @Transactional
    public AlertResponse update(Long userId, Long id, UpdateAlertRequest request) {
        var rows = synchronize(userId);
        var row = rows.stream().filter(item -> item.getId().equals(id)).findFirst()
                .orElseThrow(() -> new NotFoundException("La alerta no existe"));
        if (!active(row) || row.getRevision() != request.revision())
            throw new ConflictException("Este aviso cambió. Actualiza las alertas para revisar su estado actual.");
        var now = recurrenceClock.instant();
        switch (request.action()) {
            case READ -> { if (row.getReadAt() == null) row.setReadAt(now); }
            case SNOOZE -> {
                row.setState("SNOOZED");
                row.setSnoozedUntil(LocalDate.now(recurrenceClock.withZone(ZONE)).plusDays(1)
                        .atStartOfDay(ZONE).toInstant());
            }
            case RESUME -> { row.setState("ACTIVE"); row.setSnoozedUntil(null); }
        }
        return response(row);
    }

    private List<FinancialAlertState> synchronize(Long userId) {
        users.lockForAlertUpdate(userId).orElseThrow(() -> new NotFoundException("El usuario no existe"));
        var today = LocalDate.now(recurrenceClock.withZone(ZONE));
        var period = YearMonth.from(today).toString();
        var now = recurrenceClock.instant();
        var rows = new ArrayList<>(states.findByUserId(userId));
        var byKey = new HashMap<String, FinancialAlertState>();
        rows.forEach(row -> byKey.put(row.getEventKey(), row));
        var currentKeys = new HashSet<String>();
        for (var alert : signals.buildAlerts(userId, today.getYear(), today.getMonthValue(), true)) {
            if ("ALL_GOOD".equals(alert.getCode())) continue;
            var key = key(alert);
            currentKeys.add(key);
            var row = byKey.get(key);
            var attention = attention(alert);
            if (row == null) {
                row = new FinancialAlertState();
                row.setUserId(userId); row.setEventKey(key); row.setDetectedAt(now);
                row.setState("ACTIVE"); row.setAttentionKey(attention);
                rows.add(row);
            } else if (!active(row) || !attention.equals(row.getAttentionKey())) {
                row.setState("ACTIVE"); row.setReadAt(null); row.setSnoozedUntil(null);
                row.setClosedAt(null); row.setRevision(row.getRevision() + 1);
                row.setAttentionKey(attention);
            } else if (row.getSnoozedUntil() != null && !row.getSnoozedUntil().isAfter(now)) {
                row.setState("ACTIVE"); row.setReadAt(null); row.setSnoozedUntil(null);
            }
            row.setPeriod(period(alert)); row.setCheckedAt(now);
            try { row.setSnapshot(mapper.writeValueAsString(alert)); }
            catch (Exception error) { throw new IllegalStateException("No se pudo conservar el aviso", error); }
            states.save(row);
        }
        for (var row : rows) {
            if (active(row) && !currentKeys.contains(row.getEventKey())) {
                row.setState(row.getPeriod() != null && !period.equals(row.getPeriod()) ? "ARCHIVED" : "RESOLVED");
                row.setClosedAt(now); row.setCheckedAt(now); row.setSnoozedUntil(null);
                row.setRevision(row.getRevision() + 1);
            }
        }
        return rows;
    }

    private boolean active(FinancialAlertState row) {
        return "ACTIVE".equals(row.getState()) || "SNOOZED".equals(row.getState());
    }
    private String period(AlertResponse alert) {
        var data = alert.getData();
        return data.get("year") instanceof Number year && data.get("month") instanceof Number month
                ? YearMonth.of(year.intValue(), month.intValue()).toString() : null;
    }
    private String key(AlertResponse alert) {
        var data = alert.getData();
        if (data.containsKey("budgetId")) return "BUDGET:" + data.get("budgetId");
        if (data.containsKey("creditId")) return alert.getCode() + ":" + data.get("creditId");
        return alert.getCode() + ":" + period(alert) + ":" + data.getOrDefault("currency", "");
    }
    private String attention(AlertResponse alert) {
        var data = alert.getData();
        // Reading a warning does not mute a new installment, a new period, or an escalation.
        return alert.getCode() + ":" + data.getOrDefault("plannedInstallments", "") + ":"
                + data.getOrDefault("latestPendingId", "");
    }
    private AlertResponse snapshot(FinancialAlertState row) {
        try { return mapper.readerFor(AlertResponse.class)
                .with(com.fasterxml.jackson.databind.DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                .readValue(row.getSnapshot()); }
        catch (Exception error) { throw new IllegalStateException("No se pudo leer el aviso", error); }
    }
    private AlertResponse response(FinancialAlertState row) {
        var alert = snapshot(row);
        alert.setId(row.getId()); alert.setRevision(row.getRevision()); alert.setState(row.getState());
        alert.setRead(row.getReadAt() != null); alert.setDetectedAt(row.getDetectedAt());
        alert.setCheckedAt(row.getCheckedAt()); alert.setClosedAt(row.getClosedAt());
        alert.setSnoozedUntil(row.getSnoozedUntil());
        return alert;
    }
}
