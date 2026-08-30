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

    @Operation(
            summary = "Obtener alertas",
            description = "Obtiene las alertas financieras del usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Alertas obtenidas correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping
    public Object getAlerts(Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return alertService.buildAlerts(principal.getUser().getId());
    }

    @Operation(
            summary = "Marcar alerta como vista",
            description = "Marca una alerta como vista para que no vuelva a mostrarse."
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
