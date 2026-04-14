package com.paisabudget.controller;

import com.paisabudget.dto.BudgetRequest;
import com.paisabudget.entity.Budget;
import com.paisabudget.service.BudgetService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    private Long userId(UserDetails u) { return Long.parseLong(u.getUsername()); }

    @GetMapping
    public ResponseEntity<List<Budget>> getAll(@AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(budgetService.getBudgets(userId(u)));
    }

    @PostMapping
    public ResponseEntity<List<Budget>> create(@AuthenticationPrincipal UserDetails u,
                                               @Valid @RequestBody List<BudgetRequest> req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetService.createBudgets(userId(u), req));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Budget> toggle(@AuthenticationPrincipal UserDetails u, @PathVariable Long id) {
        return ResponseEntity.ok(budgetService.toggleBudget(userId(u), id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails u, @PathVariable Long id) {
        budgetService.deleteBudget(userId(u), id);
        return ResponseEntity.noContent().build();
    }
}
