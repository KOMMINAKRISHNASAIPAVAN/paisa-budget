package com.paisabudget.service;

import com.paisabudget.dto.*;
import com.paisabudget.entity.User;
import com.paisabudget.repository.UserRepository;
import com.paisabudget.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil         jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository  = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil         = jwtUtil;
    }

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByPhone(req.getPhone()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number already registered");

        User user = new User();
        user.setName(req.getName());
        user.setPhone(req.getPhone());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getId());
        return new AuthResponse(token, user.getId(), user.getName(), user.getPhone());
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByPhone(req.getPhone())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid phone or password"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid phone or password");

        String token = jwtUtil.generateToken(user.getId());
        return new AuthResponse(token, user.getId(), user.getName(), user.getPhone());
    }

    public User getMe(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
