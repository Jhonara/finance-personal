package com.jr.finance.api.alerts;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.alerts.dto.MarkAlertSeenRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;


@Tag(
        name = "Alerts",
        description = "Consulta y administración de alertas financieras generadas automáticamente."
)
@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;
    private final AlertLifecycleService lifecycle;

    @Operation(
            summary = "Obtener alertas",
            description = "Obtiene las alertas financieras del usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Alertas obtenidas correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping
    public java.util.List<com.jr.finance.api.alerts.dto.AlertResponse> getAlerts(Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return lifecycle.list(principal.getUser().getId(), false);
    }

    @GetMapping("/history")
    @Operation(summary = "Consultar los últimos 30 avisos resueltos o de períodos anteriores")
    public java.util.List<com.jr.finance.api.alerts.dto.AlertResponse> history(Authentication auth) {
        return lifecycle.list(((UserPrincipal) auth.getPrincipal()).getUser().getId(), true);
    }

    @PostMapping("/{id}/state")
    @Operation(summary = "Leer, posponer hasta mañana o reactivar un aviso sin resolverlo manualmente")
    public com.jr.finance.api.alerts.dto.AlertResponse update(@PathVariable Long id,
            @jakarta.validation.Valid @RequestBody com.jr.finance.api.alerts.dto.UpdateAlertRequest request,
            Authentication auth) {
        return lifecycle.update(((UserPrincipal) auth.getPrincipal()).getUser().getId(), id, request);
    }

    @Operation(
            summary = "Marcar alerta como vista",
            description = "Compatibilidad con versiones anteriores. Leer un aviso no oculta una situación pendiente."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Alerta marcada como vista"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado"),
            @ApiResponse(responseCode = "404", description = "Alerta no encontrada")
    })
    @PostMapping("/{code}/seen")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAsSeen(@PathVariable String code,
                           @RequestBody(required = false) MarkAlertSeenRequest body,
                           Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        Long relatedId = body == null ? null : body.relatedId();

        alertService.markAsSeen(userId, code, relatedId);
    }
}
