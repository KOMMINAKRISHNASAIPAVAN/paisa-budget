package com.paisabudget.controller;

import com.paisabudget.dto.*;
import com.paisabudget.entity.User;
import com.paisabudget.service.AuthService;
import com.paisabudget.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, PasswordResetService passwordResetService) {
        this.authService          = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @GetMapping("/me")
    public ResponseEntity<User> me(@AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(authService.getMe(userId));
    }

    @PutMapping("/update-name")
    public ResponseEntity<AuthResponse> updateName(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateNameRequest req) {
        Long userId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(authService.updateName(userId, req.getName()));
    }

    @PutMapping("/update-financial")
    public ResponseEntity<AuthResponse> updateFinancial(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UpdateFinancialRequest req) {
        Long userId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(authService.updateFinancial(userId, req.getMonthlyIncome(), req.getSavingsGoal()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        String otp = passwordResetService.generateOtp(req.getPhone());
        return ResponseEntity.ok(Map.of("message", "OTP generated.", "otp", otp));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        passwordResetService.resetPassword(req.getPhone(), req.getOtp(), req.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password reset successfully."));
    }
}
