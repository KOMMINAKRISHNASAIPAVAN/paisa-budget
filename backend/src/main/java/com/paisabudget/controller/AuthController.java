package com.paisabudget.controller;

import com.paisabudget.dto.*;
import com.paisabudget.entity.User;
import com.paisabudget.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
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
}
