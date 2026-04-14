package com.paisabudget.repository;

import com.paisabudget.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByUserIdOrderByExpenseDateDescCreatedAtDesc(Long userId);

    Optional<Expense> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT e FROM Expense e WHERE e.user.id = :uid AND FUNCTION('MONTH', e.expenseDate) = :month AND FUNCTION('YEAR', e.expenseDate) = :year ORDER BY e.expenseDate DESC")
    List<Expense> findByUserIdAndMonthYear(@Param("uid") Long userId, @Param("month") int month, @Param("year") int year);

    @Query("SELECT e FROM Expense e WHERE e.user.id = :uid AND e.expenseDate = :date ORDER BY e.createdAt DESC")
    List<Expense> findByUserIdAndDate(@Param("uid") Long userId, @Param("date") LocalDate date);

    @Query("SELECT e FROM Expense e WHERE e.user.id = :uid AND e.expenseDate >= :from AND e.expenseDate <= :to ORDER BY e.expenseDate DESC")
    List<Expense> findByUserIdAndDateRange(@Param("uid") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT e.category, SUM(e.amount) FROM Expense e WHERE e.user.id = :uid AND FUNCTION('MONTH', e.expenseDate) = :month AND FUNCTION('YEAR', e.expenseDate) = :year GROUP BY e.category ORDER BY SUM(e.amount) DESC")
    List<Object[]> categoryTotalsByMonthYear(@Param("uid") Long userId, @Param("month") int month, @Param("year") int year);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.user.id = :uid AND FUNCTION('MONTH', e.expenseDate) = :month AND FUNCTION('YEAR', e.expenseDate) = :year")
    Double monthTotal(@Param("uid") Long userId, @Param("month") int month, @Param("year") int year);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.user.id = :uid AND e.expenseDate >= :from")
    Double totalFrom(@Param("uid") Long userId, @Param("from") LocalDate from);

    @Query("SELECT FUNCTION('MONTH', e.expenseDate), FUNCTION('YEAR', e.expenseDate), SUM(e.amount) FROM Expense e WHERE e.user.id = :uid AND e.expenseDate >= :from GROUP BY FUNCTION('YEAR', e.expenseDate), FUNCTION('MONTH', e.expenseDate) ORDER BY FUNCTION('YEAR', e.expenseDate), FUNCTION('MONTH', e.expenseDate)")
    List<Object[]> monthlyTrendFrom(@Param("uid") Long userId, @Param("from") LocalDate from);
}
