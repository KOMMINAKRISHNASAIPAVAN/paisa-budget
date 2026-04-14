package com.paisabudget.dto;

import jakarta.validation.constraints.*;

public class BudgetRequest {

    @NotBlank(message = "Category is required")
    private String category;

    private String icon = "💸";

    @NotBlank(message = "Type is required")
    private String type;

    private String periodLabel;

    @NotNull(message = "Budget limit is required")
    @Positive(message = "Budget limit must be positive")
    private Double budgetLimit;

    public BudgetRequest() {}

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
}
