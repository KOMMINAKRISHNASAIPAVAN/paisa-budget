package com.paisabudget.controller;

import com.paisabudget.entity.AppNotification;
import com.paisabudget.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<AppNotification>> list(@AuthenticationPrincipal UserDetails ud) {
        Long userId = Long.parseLong(ud.getUsername());
        return ResponseEntity.ok(service.list(userId));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(@AuthenticationPrincipal UserDetails ud) {
        Long userId = Long.parseLong(ud.getUsername());
        return ResponseEntity.ok(Map.of("count", service.unreadCount(userId)));
    }

    @PostMapping
    public ResponseEntity<AppNotification> create(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        Long userId = Long.parseLong(ud.getUsername());
        AppNotification n = service.create(userId,
                body.getOrDefault("title",   "Notification"),
                body.getOrDefault("message", ""),
                body.getOrDefault("icon",    "🔔"),
                body.getOrDefault("type",    "ALERT"));
        return ResponseEntity.ok(n);
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal UserDetails ud) {
        Long userId = Long.parseLong(ud.getUsername());
        service.markAllRead(userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails ud,
            @PathVariable Long id) {
        Long userId = Long.parseLong(ud.getUsername());
        service.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
