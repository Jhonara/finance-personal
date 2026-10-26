package com.jr.finance.api.inbox;
import com.jr.finance.api.auth.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.List;
@RestController @RequestMapping("/api/v1/inbox/cards") @RequiredArgsConstructor
public class WalletCardController {
    private final WalletCardService service;
    private Long user(Authentication auth) { return ((UserPrincipal) auth.getPrincipal()).getUser().getId(); }
    @GetMapping public List<WalletCardService.Card> list(Authentication auth) { return service.list(user(auth)); }
    @PutMapping public WalletCardService.Card save(Authentication auth, @Valid @RequestBody WalletCardService.Input input) { return service.save(user(auth), input); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication auth, @PathVariable Long id) { service.delete(user(auth), id); }
}
