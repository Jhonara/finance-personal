package com.jr.finance.api.credit;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.credit.dto.CreateCreditRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/credits")
@RequiredArgsConstructor
public class CreditController {

    private final CreditService creditService;

    @PostMapping
    public Credit create(@Valid @RequestBody CreateCreditRequest req, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return creditService.create(userId, req);
    }

    @GetMapping
    public List<Credit> list(Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return creditService.list(userId);
    }

    @GetMapping("/{id}")
    public Credit getById(@PathVariable Long id, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return creditService.findByIdForUser(userId, id);
    }
}
