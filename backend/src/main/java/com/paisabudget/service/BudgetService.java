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

    private final BudgetRepository        budgetRepository;
    private final BudgetHistoryRepository historyRepository;
    private final UserRepository          userRepository;

    public BudgetService(BudgetRepository budgetRepository,
                         BudgetHistoryRepository historyRepository,
                         UserRepository userRepository) {
        this.budgetRepository  = budgetRepository;
        this.historyRepository = historyRepository;
        this.userRepository    = userRepository;
    }

    public List<BudgetHistory> getHistory(Long userId) {
        return historyRepository.findByUserIdOrderByClosedAtDesc(userId);
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
                b.setBudgetLimit(req.getBudgetLimit());
                b.setBaseBudgetLimit(req.getBudgetLimit());
                b.setTotalBudget(req.getTotalBudget());
            } else {
                // Existing budget — accumulate amounts instead of replacing
                b.setBudgetLimit(b.getBudgetLimit() + req.getBudgetLimit());
                b.setTotalBudget(b.getTotalBudget() + req.getTotalBudget());
            }

            b.setIcon(req.getIcon());
            b.setCategory(req.getCategory());
            b.setType(type);
            b.setPeriodLabel(req.getPeriodLabel());
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
    public Budget rolloverBudget(Long userId, Long budgetId, Double carryover, String newPeriodLabel) {
        Budget b = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Budget not found"));

        BudgetHistory history = new BudgetHistory();
        history.setUserId(userId);
        history.setCategory(b.getCategory());
        history.setIcon(b.getIcon());
        history.setType(b.getType().name());
        history.setPeriodLabel(b.getPeriodLabel());
        history.setBudgetLimit(b.getBudgetLimit());
        history.setBaseBudgetLimit(b.getBaseBudgetLimit());
        history.setSpent(b.getSpent());
        historyRepository.save(history);

        Double base = b.getBaseBudgetLimit() != null ? b.getBaseBudgetLimit() : b.getBudgetLimit();
        b.setBudgetLimit(base + carryover);
        b.setBaseBudgetLimit(base);
        b.setSpent(0.0);
        b.setStatus("On Track");
        b.setPeriodLabel(newPeriodLabel);
        return budgetRepository.save(b);
    }

    @Transactional
    public void deleteBudget(Long userId, Long budgetId) {
        Budget budget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Budget not found"));
        budgetRepository.delete(budget);
    }
}
