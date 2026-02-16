package com.jr.finance.api.dashboard;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.dashboard.dto.DashboardMonthResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/month")
    public DashboardMonthResponse month(@RequestParam int year,
                                        @RequestParam int month,
                                        Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return dashboardService.getMonthDashboard(userId, year, month);
    }
}
