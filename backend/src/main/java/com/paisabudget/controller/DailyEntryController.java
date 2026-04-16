package com.paisabudget.controller;

import com.paisabudget.dto.DailyEntryRequest;
import com.paisabudget.entity.DailyEntry;
import com.paisabudget.service.DailyEntryService;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/daily")
public class DailyEntryController {

    private final DailyEntryService service;

    public DailyEntryController(DailyEntryService service) {
        this.service = service;
    }

    private Long userId(UserDetails u) { return Long.parseLong(u.getUsername()); }

    @GetMapping
    public ResponseEntity<List<DailyEntry>> getAll(
            @AuthenticationPrincipal UserDetails u,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(service.getEntries(userId(u), month, year));
    }

    @PostMapping
    public ResponseEntity<DailyEntry> add(@AuthenticationPrincipal UserDetails u,
                                          @RequestBody DailyEntryRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addEntry(userId(u), req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails u, @PathVariable Long id) {
        service.deleteEntry(userId(u), id);
        return ResponseEntity.noContent().build();
    }
}
