package com.paisabudget.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ResetPasswordRequest {

    @NotBlank(message = "Phone is required")
    private String phone;

    @NotBlank(message = "OTP is required")
    private String otp;

    @NotBlank(message = "New password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String newPassword;

    public ResetPasswordRequest() {}

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}
