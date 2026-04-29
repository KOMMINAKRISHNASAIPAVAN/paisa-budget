package com.paisabudget.service;

import com.paisabudget.entity.AppNotification;
import com.paisabudget.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository repo;

    public NotificationService(NotificationRepository repo) {
        this.repo = repo;
    }

    public AppNotification create(Long userId, String title, String message, String icon, String type) {
        AppNotification n = new AppNotification();
        n.setUserId(userId);
        n.setTitle(title);
        n.setMessage(message);
        n.setIcon(icon);
        n.setType(type);
        return repo.save(n);
    }

    public List<AppNotification> list(Long userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long unreadCount(Long userId) {
        return repo.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAllRead(Long userId) {
        List<AppNotification> unread = repo.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().filter(n -> !n.isRead()).toList();
        unread.forEach(n -> n.setRead(true));
        repo.saveAll(unread);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        AppNotification n = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!n.getUserId().equals(userId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        repo.delete(n);
    }
}
