package com.paisabudget.service;

import com.paisabudget.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PasswordResetService {

    private record OtpRecord(String otp, Instant expiry) {}

    private final Map<String, OtpRecord> store = new ConcurrentHashMap<>();
    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;

    public PasswordResetService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository  = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Generates a 6-digit OTP. In production, send via SMS instead of returning it. */
    public String generateOtp(String phone) {
        if (!userRepository.existsByPhone(phone))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with this phone number.");
        String otp = String.format("%06d", new Random().nextInt(1_000_000));
        store.put(phone, new OtpRecord(otp, Instant.now().plusSeconds(600)));
        return otp;
    }

    @Transactional
    public void resetPassword(String phone, String otp, String newPassword) {
        OtpRecord record = store.get(phone);
        if (record == null || Instant.now().isAfter(record.expiry()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP expired. Please request a new one.");
        if (!record.otp().equals(otp))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP. Please try again.");
        var user = userRepository.findByPhone(phone)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        store.remove(phone);
    }
}
