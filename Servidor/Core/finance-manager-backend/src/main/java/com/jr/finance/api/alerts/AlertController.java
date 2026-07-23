package com.jr.finance.api.alerts;

import com.jr.finance.api.auth.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@Tag(
        name = "Alertas",
        description = "Consulta y administración de alertas financieras generadas automáticamente."
)
@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;
    private final UserAlertSeenRepository seenRepository;

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
    public void markAsSeen(@PathVariable String code,
                           @RequestBody(required = false) Map<String, Object> body,
                           Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        Long relatedId = body != null && body.get("relatedId") != null
                ? Long.valueOf(body.get("relatedId").toString())
                : null;

        var seen = seenRepository.findByUserIdAndAlertCodeAndRelatedId(userId, code, relatedId)
                .orElseGet(UserAlertSeen::new);

        seen.setUserId(userId);
        seen.setAlertCode(code);
        seen.setRelatedId(relatedId);
        seen.setSeenAt(LocalDateTime.now());

        seenRepository.save(seen);
    }
}
