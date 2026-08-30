package com.jr.finance.api.transfer;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.transfer.dto.CreateTransferRequest;
import com.jr.finance.api.transfer.dto.TransferResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/transfers")
@RequiredArgsConstructor
@Tag(name = "Transfers", description = "Movimientos entre dos cuentas propias; no afectan ingresos ni gastos.")
public class TransferController {
    private final TransferService service;

    @Operation(summary = "Transferir entre cuentas", description = "Las cuentas deben estar activas, pertenecer al usuario, usar la misma moneda y la cuenta origen debe tener saldo suficiente.")
    @ApiResponses({@ApiResponse(responseCode = "201", description = "Transferencia registrada"), @ApiResponse(responseCode = "400", description = "Saldo, moneda o cuentas inválidos"), @ApiResponse(responseCode = "404", description = "Cuenta inexistente o ajena")})
    @PostMapping
    public ResponseEntity<TransferResponse> create(@Valid @RequestBody CreateTransferRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(((UserPrincipal) auth.getPrincipal()).getUser().getId(), request));
    }
}
