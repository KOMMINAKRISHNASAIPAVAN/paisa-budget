package com.paisabudget.repository;

import com.paisabudget.entity.BudgetHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BudgetHistoryRepository extends JpaRepository<BudgetHistory, Long> {
    List<BudgetHistory> findByUserIdOrderByClosedAtDesc(Long userId);
}
