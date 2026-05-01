package com.paisabudget.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "budget_history")
public class BudgetHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(length = 10)
    private String icon = "💸";

    @Column(length = 10)
    private String type;

    @Column(name = "period_label", length = 50)
    private String periodLabel;

    @Column(name = "budget_limit")
    private Double budgetLimit;

    @Column(name = "base_budget_limit")
    private Double baseBudgetLimit;

    @Column
    private Double spent = 0.0;

    @Column(name = "closed_at", updatable = false)
    private LocalDateTime closedAt = LocalDateTime.now();

    public BudgetHistory() {}

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getPeriodLabel() { return periodLabel; }
    public void setPeriodLabel(String periodLabel) { this.periodLabel = periodLabel; }
    public Double getBudgetLimit() { return budgetLimit; }
    public void setBudgetLimit(Double budgetLimit) { this.budgetLimit = budgetLimit; }
    public Double getBaseBudgetLimit() { return baseBudgetLimit; }
    public void setBaseBudgetLimit(Double baseBudgetLimit) { this.baseBudgetLimit = baseBudgetLimit; }
    public Double getSpent() { return spent; }
    public void setSpent(Double spent) { this.spent = spent; }
    public LocalDateTime getClosedAt() { return closedAt; }
}
