package com.paisabudget.dto;

import jakarta.validation.constraints.NotBlank;

public class ForgotPasswordRequest {

    @NotBlank(message = "Phone is required")
    private String phone;

    public ForgotPasswordRequest() {}

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}
