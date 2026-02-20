package com.jr.finance.api.alerts;

import com.jr.finance.api.auth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;
    private final UserAlertSeenRepository seenRepository;

    @GetMapping
    public Object getAlerts(Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return alertService.buildAlerts(principal.getUser().getId());
    }

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
