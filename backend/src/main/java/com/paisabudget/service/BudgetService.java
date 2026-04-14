package com.paisabudget.service;

import com.paisabudget.dto.BudgetRequest;
import com.paisabudget.entity.*;
import com.paisabudget.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final UserRepository   userRepository;

    public BudgetService(BudgetRepository budgetRepository, UserRepository userRepository) {
        this.budgetRepository = budgetRepository;
        this.userRepository   = userRepository;
    }

    public List<Budget> getBudgets(Long userId) {
        return budgetRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public List<Budget> createBudgets(Long userId, List<BudgetRequest> requests) {
        User user = userRepository.getReferenceById(userId);

        List<Budget> budgets = requests.stream().map(req -> {
            Budget.BudgetType type = Budget.BudgetType.valueOf(req.getType());

            // Upsert: update existing budget for same category+type instead of duplicating
            Budget b = budgetRepository
                    .findByUserIdAndCategoryIgnoreCaseAndType(userId, req.getCategory(), type)
                    .orElseGet(Budget::new);

            if (b.getId() == null) {
                // New budget — set user and reset spent/status
                b.setUser(user);
                b.setSpent(0.0);
                b.setStatus("On Track");
                b.setIsActive(true);
            }

            b.setIcon(req.getIcon());
            b.setCategory(req.getCategory());
            b.setType(type);
            b.setPeriodLabel(req.getPeriodLabel());
            b.setBudgetLimit(req.getBudgetLimit());
            return b;
        }).toList();

        return budgetRepository.saveAll(budgets);
    }

    @Transactional
    public Budget toggleBudget(Long userId, Long budgetId) {
        Budget budget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Budget not found"));
        budget.setIsActive(!budget.getIsActive());
        return budgetRepository.save(budget);
    }

    @Transactional
    public void deleteBudget(Long userId, Long budgetId) {
        Budget budget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Budget not found"));
        budgetRepository.delete(budget);
    }
}
