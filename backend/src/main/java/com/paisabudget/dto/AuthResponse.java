package com.paisabudget.dto;

public class AuthResponse {

    private String token;
    private Long   id;
    private String name;
    private String phone;
    private Double monthlyIncome;
    private Double savingsGoal;

    public AuthResponse() {}

    public AuthResponse(String token, Long id, String name, String phone, Double monthlyIncome, Double savingsGoal) {
        this.token         = token;
        this.id            = id;
        this.name          = name;
        this.phone         = phone;
        this.monthlyIncome = monthlyIncome;
        this.savingsGoal   = savingsGoal;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Double getMonthlyIncome() { return monthlyIncome; }
    public void setMonthlyIncome(Double monthlyIncome) { this.monthlyIncome = monthlyIncome; }

    public Double getSavingsGoal() { return savingsGoal; }
    public void setSavingsGoal(Double savingsGoal) { this.savingsGoal = savingsGoal; }
}
