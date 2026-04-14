package com.paisabudget.service;

import com.paisabudget.repository.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.*;

@Service
public class InsightsService {

    private final ExpenseRepository expenseRepository;
    private final BudgetRepository  budgetRepository;

    public InsightsService(ExpenseRepository expenseRepository, BudgetRepository budgetRepository) {
        this.expenseRepository = expenseRepository;
        this.budgetRepository  = budgetRepository;
    }

    public Map<String, Object> getSummary(Long userId, int month, int year) {
        double monthTotal  = expenseRepository.monthTotal(userId, month, year);
        double weekTotal   = expenseRepository.totalFrom(userId, LocalDate.now().minusDays(6));
        double dayTotal    = expenseRepository.totalFrom(userId, LocalDate.now());
        int    daysPassed  = LocalDate.now().getDayOfMonth();
        double avgDaily    = daysPassed > 0 ? Math.round(monthTotal / daysPassed) : 0;
        double budgetTotal = budgetRepository.sumActiveLimitsByUserId(userId);
        int    savingsRate = budgetTotal > 0
                ? Math.max(0, (int) Math.round(((budgetTotal - monthTotal) / budgetTotal) * 100))
                : 0;

        List<Object[]> rawCats = expenseRepository.categoryTotalsByMonthYear(userId, month, year);
        List<Map<String, Object>> categories = rawCats.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("category", row[0]);
            m.put("total",    row[1]);
            return m;
        }).toList();

        LocalDate sixMonthsAgo = LocalDate.now().withDayOfMonth(1).minusMonths(5);
        List<Object[]> rawTrend = expenseRepository.monthlyTrendFrom(userId, sixMonthsAgo);
        List<Map<String, Object>> trend = rawTrend.stream().map(row -> {
            int mo = ((Number) row[0]).intValue();
            int yr = ((Number) row[1]).intValue();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("label",   LocalDate.of(yr, mo, 1).getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH));
            m.put("year",    yr);
            m.put("expense", row[2]);
            return m;
        }).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("monthTotal",  monthTotal);
        result.put("weekTotal",   weekTotal);
        result.put("dayTotal",    dayTotal);
        result.put("avgDaily",    avgDaily);
        result.put("savingsRate", savingsRate);
        result.put("categories",  categories);
        result.put("trend",       trend);
        return result;
    }

    public Map<String, Object> getMonthHistory(Long userId, int month, int year) {
        var expenses = expenseRepository.findByUserIdAndMonthYear(userId, month, year);
        var rawCats  = expenseRepository.categoryTotalsByMonthYear(userId, month, year);
        double grand = expenses.stream().mapToDouble(e -> e.getAmount()).sum();

        List<Map<String, Object>> categories = rawCats.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("category", row[0]);
            m.put("total",    row[1]);
            m.put("pct",      grand > 0 ? Math.round(((Number) row[1]).doubleValue() / grand * 100) : 0);
            return m;
        }).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("expenses",   expenses);
        result.put("categories", categories);
        result.put("grandTotal", grand);
        return result;
    }
}
