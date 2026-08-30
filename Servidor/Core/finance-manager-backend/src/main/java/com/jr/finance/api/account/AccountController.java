package com.jr.finance.api.account;

import com.jr.finance.api.account.dto.AccountResponse;
import com.jr.finance.api.account.dto.CreateAccountRequest;
import com.jr.finance.api.account.dto.CreateOpeningBalanceRequest;
import com.jr.finance.api.account.dto.OpeningBalanceResponse;
import com.jr.finance.api.account.dto.UpdateAccountRequest;
import com.jr.finance.api.account.mapper.AccountMapper;
import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.ledger.FinancialOperationCommand;
import com.jr.finance.api.ledger.FinancialTransaction;
import com.jr.finance.api.ledger.LedgerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
@Tag(name = "Accounts", description = "Operaciones para administrar cuentas financieras sin saldo calculado.")
public class AccountController {

    private final AccountService accountService;
    private final AccountMapper accountMapper;
    private final LedgerService ledgerService;

    @PostMapping(consumes = "application/json", produces = "application/json")
    @Operation(summary = "Crear una cuenta financiera")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Cuenta creada"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "409", description = "Nombre duplicado"),
            @ApiResponse(responseCode = "401", description = "No autenticado")
    })
    public ResponseEntity<AccountResponse> create(@Valid @RequestBody CreateAccountRequest request,
                                                   Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(accountMapper.toResponse(accountService.create(userId(authentication), request)));
    }

    @GetMapping(produces = "application/json")
    @Operation(summary = "Listar las cuentas propias")
    public List<AccountResponse> list(@RequestParam(required = false) Boolean active,
                                      Authentication authentication) {
        return accountMapper.toResponseList(accountService.list(userId(authentication), active));
    }

    @GetMapping(value = "/{id}", produces = "application/json")
    @Operation(summary = "Consultar una cuenta propia")
    @ApiResponses(@ApiResponse(responseCode = "404", description = "Cuenta inexistente o ajena"))
    public AccountResponse get(@PathVariable Long id, Authentication authentication) {
        return accountMapper.toResponse(accountService.get(userId(authentication), id));
    }

    @PostMapping(value = "/{accountId}/opening-balance", consumes = "application/json", produces = "application/json")
    @Operation(summary = "Registrar saldo inicial", description = "Crea el único OPENING_BALANCE original de una cuenta activa. Para corregirlo se debe revertir la operación existente; no se permiten saldos iniciales adicionales.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Saldo inicial registrado"),
            @ApiResponse(responseCode = "400", description = "Solicitud inválida o cuenta inactiva"),
            @ApiResponse(responseCode = "404", description = "Cuenta inexistente o ajena"),
            @ApiResponse(responseCode = "409", description = "La cuenta ya tiene saldo inicial")
    })
    public ResponseEntity<OpeningBalanceResponse> createOpeningBalance(@PathVariable Long accountId,
                                                                         @Valid @RequestBody CreateOpeningBalanceRequest request,
                                                                         Authentication authentication) {
        FinancialTransaction transaction = ledgerService.recordOpeningBalance(userId(authentication), accountId,
                new FinancialOperationCommand(request.amount(), request.effectiveDate(), request.description(), null, null));
        return ResponseEntity.status(HttpStatus.CREATED).body(new OpeningBalanceResponse(
                transaction.getId(), accountId, transaction.getType().name(), request.amount(), transaction.getCurrency(),
                transaction.getEffectiveDate(), transaction.getDescription()));
    }

    @PatchMapping(value = "/{id}", consumes = "application/json", produces = "application/json")
    @Operation(summary = "Actualizar metadatos de una cuenta propia")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Cuenta actualizada"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "404", description = "Cuenta inexistente o ajena"),
            @ApiResponse(responseCode = "409", description = "Nombre duplicado o versión obsoleta")
    })
    public AccountResponse update(@PathVariable Long id,
                                  @Valid @RequestBody UpdateAccountRequest request,
                                  Authentication authentication) {
        return accountMapper.toResponse(accountService.update(userId(authentication), id, request));
    }

    private Long userId(Authentication authentication) {
        return ((UserPrincipal) authentication.getPrincipal()).getUser().getId();
    }
}
