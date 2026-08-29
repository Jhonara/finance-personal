package com.jr.finance.api.expense;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.expense.dto.CreateExpenseRequest;
import com.jr.finance.api.expense.dto.MonthComparisonResponse;
import com.jr.finance.api.expense.dto.MonthlySummaryResponse;
import com.jr.finance.api.expense.dto.PeriodComparisonResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.jr.finance.api.expense.dto.ExpenseResponse;

import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
@Tag(
        name = "Gastos",
        description = "Operaciones para registrar, consultar, comparar y eliminar gastos del usuario."
)
public class ExpenseController {

    private final ExpenseService expenseService;

    @Operation(
            summary = "Registrar un gasto",
            description = "Registra un nuevo gasto asociado al usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Gasto registrado correctamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @PostMapping(
            consumes = "application/json",
            produces = "application/json"
    )
    public ExpenseResponse create(
            @Valid @RequestBody CreateExpenseRequest req,
            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return expenseService.create(userId, req);
    }

    @Operation(
            summary = "Listar gastos por mes",
            description = "Obtiene todos los gastos registrados por el usuario durante un mes específico."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Gastos obtenidos correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping(
            value = "/month",
            produces = "application/json"
    )
    public List<ExpenseResponse> listByMonth(

            @Parameter(
                    description = "Año a consultar.",
                    example = "2026"
            )
            @RequestParam int year,

            @Parameter(
                    description = "Mes a consultar (1-12).",
                    example = "7"
            )
            @RequestParam int month,

            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return expenseService.listByMonth(userId, year, month);
    }

    @Operation(
            summary = "Obtener resumen mensual",
            description = "Genera un resumen de los gastos del mes, incluyendo totales por tipo y categoría."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Resumen generado correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping(
            value = "/summary",
            produces = "application/json"
    )
    public MonthlySummaryResponse summary(

            @Parameter(
                    description = "Año a consultar.",
                    example = "2026"
            )
            @RequestParam int year,

            @Parameter(
                    description = "Mes a consultar (1-12).",
                    example = "7"
            )
            @RequestParam int month,

            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return expenseService.monthlySummary(userId, year, month);
    }

    @Operation(
            summary = "Comparar con el mes anterior",
            description = "Compara los gastos del mes seleccionado con los del mes inmediatamente anterior."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Comparación realizada correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping(
            value = "/compare",
            produces = "application/json"
    )
    public MonthComparisonResponse compare(

            @Parameter(
                    description = "Año del mes a comparar.",
                    example = "2026"
            )
            @RequestParam int year,

            @Parameter(
                    description = "Mes a comparar (1-12).",
                    example = "7"
            )
            @RequestParam int month,

            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return expenseService.compareMonth(userId, year, month);
    }

    @Operation(
            summary = "Comparar dos períodos",
            description = "Compara los gastos registrados entre dos meses diferentes."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Comparación realizada correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping(
            value = "/compare-periods",
            produces = "application/json"
    )
    public PeriodComparisonResponse comparePeriods(

            @Parameter(
                    description = "Año del primer período.",
                    example = "2026"
            )
            @RequestParam int year1,

            @Parameter(
                    description = "Mes del primer período (1-12).",
                    example = "7"
            )
            @RequestParam int month1,

            @Parameter(
                    description = "Año del segundo período.",
                    example = "2026"
            )
            @RequestParam int year2,

            @Parameter(
                    description = "Mes del segundo período (1-12).",
                    example = "6"
            )
            @RequestParam int month2,

            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return expenseService.comparePeriods(userId, year1, month1, year2, month2);
    }

    @Operation(
            summary = "Eliminar un gasto",
            description = "Elimina un gasto perteneciente al usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Gasto eliminado correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado"),
            @ApiResponse(responseCode = "404", description = "Gasto no encontrado")
    })
    @DeleteMapping("/{id}")
    public void delete(

            @Parameter(
                    description = "Identificador del gasto.",
                    example = "1"
            )
            @PathVariable Long id,

            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        expenseService.delete(userId, id);
    }
}
