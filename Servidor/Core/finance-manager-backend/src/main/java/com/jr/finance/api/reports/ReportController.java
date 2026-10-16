package com.jr.finance.api.reports;

import com.jr.finance.api.auth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reports;

    @GetMapping("/month")
    public Map<String, MonthlyCurrencyReport> month(@RequestParam int year, @RequestParam int month,
                                                      Authentication authentication) {
        var principal = (UserPrincipal) authentication.getPrincipal();
        return reports.month(principal.getUser().getId(), year, month);
    }
}
