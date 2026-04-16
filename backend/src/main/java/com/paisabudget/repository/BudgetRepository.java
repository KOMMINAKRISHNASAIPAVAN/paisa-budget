package com.paisabudget.repository;

import com.paisabudget.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {

    List<Budget> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Budget> findByIdAndUserId(Long id, Long userId);

    Optional<Budget> findByUserIdAndCategoryIgnoreCaseAndType(Long userId, String category, Budget.BudgetType type);

    @Query("SELECT COALESCE(SUM(b.budgetLimit), 0) FROM Budget b WHERE b.user.id = :uid AND b.isActive = true")
    Double sumActiveLimitsByUserId(@Param("uid") Long userId);

    @Modifying
    @Query("""
        UPDATE Budget b SET
          b.spent  = GREATEST(b.spent - :amt, 0),
          b.status = CASE
            WHEN GREATEST(b.spent - :amt, 0) > b.budgetLimit         THEN 'Over'
            WHEN GREATEST(b.spent - :amt, 0) >= b.budgetLimit * 0.9  THEN 'Warning'
            ELSE 'On Track'
          END
        WHERE b.user.id = :uid
          AND b.isActive = true
          AND LOWER(b.category) = LOWER(:cat)
          AND b.type = :type
        """)
    void subtractSpent(@Param("uid") Long userId, @Param("cat") String category,
                       @Param("amt") Double amount, @Param("type") Budget.BudgetType type);

    @Modifying
    @Query("""
        UPDATE Budget b SET
          b.spent  = b.spent + :amt,
          b.status = CASE
            WHEN b.spent + :amt > b.budgetLimit         THEN 'Over'
            WHEN b.spent + :amt >= b.budgetLimit * 0.9  THEN 'Warning'
            ELSE 'On Track'
          END
        WHERE b.user.id = :uid
          AND b.isActive = true
          AND LOWER(b.category) = LOWER(:cat)
          AND b.type = :type
        """)
    void addSpent(@Param("uid") Long userId, @Param("cat") String category,
                  @Param("amt") Double amount, @Param("type") Budget.BudgetType type);
}
