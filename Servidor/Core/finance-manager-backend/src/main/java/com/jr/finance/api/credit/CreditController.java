package com.jr.finance.api.credit;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.credit.dto.CreateCreditRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/credits")
@RequiredArgsConstructor
@Tag(
        name = "Créditos",
        description = "Operaciones para administrar los créditos registrados por el usuario."
)
public class CreditController {

    private final CreditService creditService;

    @Operation(
            summary = "Registrar crédito",
            description = "Crea un nuevo crédito asociado al usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Crédito registrado correctamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @PostMapping(
            consumes = "application/json",
            produces = "application/json"
    )
    public Credit create(@Valid @RequestBody CreateCreditRequest req, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return creditService.create(userId, req);
    }

    @Operation(
            summary = "Listar créditos",
            description = "Obtiene todos los créditos registrados por el usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de créditos obtenida correctamente",
                    content = @Content(
                            array = @ArraySchema(schema = @Schema(implementation = Credit.class))
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping(produces = "application/json")
    public List<Credit> list(Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return creditService.list(userId);
    }

    @Operation(
            summary = "Obtener crédito",
            description = "Obtiene la información de un crédito específico del usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Crédito encontrado"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado"),
            @ApiResponse(responseCode = "404", description = "Crédito no encontrado")
    })
    @GetMapping(
            value = "/{id}",
            produces = "application/json"
    )
    public Credit getById(@PathVariable Long id, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return creditService.findByIdForUser(userId, id);
    }
}