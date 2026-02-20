package com.jr.finance.api.credit;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.credit.dto.CreateCreditPaymentRequest;
import com.jr.finance.api.credit.dto.CreditStatusResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/credits")
@RequiredArgsConstructor
public class CreditPaymentController {

    private final CreditPaymentService paymentService;

    @PostMapping("/{id}/payments")
    public CreditStatusResponse registerPayment(@PathVariable Long id,
                                                @Valid @RequestBody CreateCreditPaymentRequest req,
                                                Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return paymentService.registerPayment(userId, id, req);
    }
}
