package com.jr.finance.api.inbox;

import com.jr.finance.api.auth.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.tags.Tag;
import static com.jr.finance.api.inbox.InboxDtos.*;

@RestController @RequestMapping("/api/v1/inbox") @RequiredArgsConstructor
@Tag(name = "Purchase review", description = "Borradores voluntarios; no afectan saldos hasta su confirmación.")
public class InboxController {
    private final InboxService service;
    private Long user(Authentication auth) { return ((UserPrincipal) auth.getPrincipal()).getUser().getId(); }
    @GetMapping public DraftPage list(Authentication auth, @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "false") boolean history) {
        return service.list(user(auth), page, history);
    }
    @GetMapping("/{id}") public Draft get(Authentication auth, @PathVariable Long id) { return service.get(user(auth), id); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Draft create(Authentication auth, @Valid @RequestBody Create request) { return service.create(user(auth), request); }
    @PostMapping("/native") public Draft nativeIntake(Authentication auth, @Valid @RequestBody NativeIntake request) { return service.nativeIntake(user(auth), request); }
    @PostMapping("/{id}/card") public Draft assignCard(Authentication auth, @PathVariable Long id, @Valid @RequestBody AssignCard request) { return service.assignCard(user(auth), id, request); }
    @PutMapping("/{id}") public Draft update(Authentication auth, @PathVariable Long id, @Valid @RequestBody Update request) { return service.update(user(auth), id, request); }
    @PostMapping("/{id}/confirm") public Draft confirm(Authentication auth, @PathVariable Long id, @Valid @RequestBody Confirm request) { return service.confirm(user(auth), id, request); }
    @PostMapping("/{id}/link") public Draft link(Authentication auth, @PathVariable Long id, @Valid @RequestBody Link request) { return service.link(user(auth), id, request); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void discard(Authentication auth, @PathVariable Long id, @RequestParam long version) { service.discard(user(auth), id, version); }
}
