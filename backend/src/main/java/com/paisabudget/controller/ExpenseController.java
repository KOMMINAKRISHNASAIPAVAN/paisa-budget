package com.paisabudget.controller;

import com.paisabudget.dto.ExpenseRequest;
import com.paisabudget.entity.Expense;
import com.paisabudget.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    private Long userId(UserDetails u) { return Long.parseLong(u.getUsername()); }

    @GetMapping
    public ResponseEntity<List<Expense>> getAll(@AuthenticationPrincipal UserDetails u,
                                                @RequestParam(required = false) Integer month,
                                                @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(expenseService.getExpenses(userId(u), month, year));
    }

    @PostMapping
    public ResponseEntity<Expense> add(@AuthenticationPrincipal UserDetails u,
                                       @Valid @RequestBody ExpenseRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(expenseService.addExpense(userId(u), req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails u, @PathVariable Long id) {
        expenseService.deleteExpense(userId(u), id);
        return ResponseEntity.noContent().build();
    }
}
