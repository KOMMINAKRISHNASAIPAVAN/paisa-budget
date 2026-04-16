package com.paisabudget.service;

import com.paisabudget.dto.DailyEntryRequest;
import com.paisabudget.entity.DailyEntry;
import com.paisabudget.entity.User;
import com.paisabudget.repository.DailyEntryRepository;
import com.paisabudget.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class DailyEntryService {

    private final DailyEntryRepository repo;
    private final UserRepository userRepo;

    public DailyEntryService(DailyEntryRepository repo, UserRepository userRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
    }

    public List<DailyEntry> getEntries(Long userId, Integer month, Integer year) {
        if (month != null && year != null) {
            return repo.findByUserIdAndMonth(userId, month, year);
        }
        return repo.findByUserId(userId);
    }

    public DailyEntry addEntry(Long userId, DailyEntryRequest req) {
        User user = userRepo.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        DailyEntry entry = new DailyEntry();
        entry.setUser(user);
        entry.setDescription(req.getDescription());
        entry.setAmount(req.getAmount());
        entry.setNote(req.getNote());
        entry.setEntryDate(req.getEntryDate() != null ? req.getEntryDate() : LocalDate.now());

        return repo.save(entry);
    }

    public void deleteEntry(Long userId, Long entryId) {
        DailyEntry entry = repo.findByIdAndUserId(entryId, userId)
            .orElseThrow(() -> new RuntimeException("Entry not found"));
        repo.delete(entry);
    }
}
