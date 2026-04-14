package com.paisabudget.controller;

import com.paisabudget.service.InsightsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/insights")
public class InsightsController {

    private final InsightsService insightsService;

    public InsightsController(InsightsService insightsService) {
        this.insightsService = insightsService;
    }

    private Long userId(UserDetails u) { return Long.parseLong(u.getUsername()); }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary(
            @AuthenticationPrincipal UserDetails u,
            @RequestParam(defaultValue = "0") int month,
            @RequestParam(defaultValue = "0") int year) {
        int m = month > 0 ? month : LocalDate.now().getMonthValue();
        int y = year  > 0 ? year  : LocalDate.now().getYear();
        return ResponseEntity.ok(insightsService.getSummary(userId(u), m, y));
    }

    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> history(
            @AuthenticationPrincipal UserDetails u,
            @RequestParam int month,
            @RequestParam int year) {
        return ResponseEntity.ok(insightsService.getMonthHistory(userId(u), month, year));
    }
}
