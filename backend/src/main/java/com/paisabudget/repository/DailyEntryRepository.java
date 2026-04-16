package com.paisabudget.repository;

import com.paisabudget.entity.DailyEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DailyEntryRepository extends JpaRepository<DailyEntry, Long> {

    @Query("SELECT d FROM DailyEntry d WHERE d.user.id = :uid ORDER BY d.entryDate DESC, d.createdAt DESC")
    List<DailyEntry> findByUserId(@Param("uid") Long userId);

    @Query("SELECT d FROM DailyEntry d WHERE d.user.id = :uid AND MONTH(d.entryDate) = :month AND YEAR(d.entryDate) = :year ORDER BY d.entryDate DESC, d.createdAt DESC")
    List<DailyEntry> findByUserIdAndMonth(@Param("uid") Long userId, @Param("month") int month, @Param("year") int year);

    Optional<DailyEntry> findByIdAndUserId(Long id, Long userId);
}
