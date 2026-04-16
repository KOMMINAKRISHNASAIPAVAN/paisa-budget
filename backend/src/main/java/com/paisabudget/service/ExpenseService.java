package com.paisabudget.service;

import com.paisabudget.dto.ExpenseRequest;
import com.paisabudget.entity.*;
import com.paisabudget.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final BudgetRepository  budgetRepository;
    private final UserRepository    userRepository;

    public ExpenseService(ExpenseRepository expenseRepository, BudgetRepository budgetRepository, UserRepository userRepository) {
        this.expenseRepository = expenseRepository;
        this.budgetRepository  = budgetRepository;
        this.userRepository    = userRepository;
    }

    public List<Expense> getExpenses(Long userId, Integer month, Integer year) {
        if (month != null && year != null)
            return expenseRepository.findByUserIdAndMonthYear(userId, month, year);
        return expenseRepository.findByUserIdOrderByExpenseDateDescCreatedAtDesc(userId);
    }

    @Transactional
    public Expense addExpense(Long userId, ExpenseRequest req) {
        User user = userRepository.getReferenceById(userId);

        Expense expense = new Expense();
        expense.setUser(user);
        expense.setIcon(req.getIcon());
        expense.setDescription(req.getDescription());
        expense.setCategory(req.getCategory());
        expense.setAmount(req.getAmount());
        expense.setPaymentMethod(req.getPaymentMethod());
        expense.setExpenseDate(req.getExpenseDate());

        Budget.BudgetType budgetType = Budget.BudgetType.valueOf(req.getBudgetType());
        expense.setBudgetType(budgetType);

        Expense saved = expenseRepository.save(expense);
        budgetRepository.addSpent(userId, req.getCategory(), req.getAmount(), budgetType);
        return saved;
    }

    @Transactional
    public void deleteExpense(Long userId, Long expenseId) {
        Expense expense = expenseRepository.findByIdAndUserId(expenseId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        expenseRepository.delete(expense);
    }
}
