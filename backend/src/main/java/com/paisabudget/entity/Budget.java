package com.paisabudget.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "budgets")
public class Budget {

    public enum BudgetType { monthly, weekly }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 10)
    private String icon = "💸";

    @Column(nullable = false, length = 100)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BudgetType type = BudgetType.monthly;

    @Column(name = "period_label", length = 50)
    private String periodLabel;

    @Column(name = "total_budget")
    private Double totalBudget;

    @Column(name = "budget_limit", nullable = false)
    private Double budgetLimit;

    @Column(nullable = false)
    private Double spent = 0.0;

    @Column(length = 20)
    private String status = "On Track";

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Budget() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BudgetType getType() { return type; }
    public void setType(BudgetType type) { this.type = type; }

    public String getPeriodLabel() { return periodLabel; }
    public void setPeriodLabel(String periodLabel) { this.periodLabel = periodLabel; }

    public Double getTotalBudget() { return totalBudget; }
    public void setTotalBudget(Double totalBudget) { this.totalBudget = totalBudget; }

    public Double getBudgetLimit() { return budgetLimit; }
    public void setBudgetLimit(Double budgetLimit) { this.budgetLimit = budgetLimit; }

    public Double getSpent() { return spent; }
    public void setSpent(Double spent) { this.spent = spent; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
