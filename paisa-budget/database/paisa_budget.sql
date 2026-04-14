-- ============================================================
--  PAISA BUDGET — Database Setup Script
--  Database : MySQL 8.0+
--  Run this once on any MySQL instance to set up all tables.
--  Safe to re-run: uses IF NOT EXISTS everywhere.
-- ============================================================

CREATE DATABASE IF NOT EXISTS paisa_budget
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE paisa_budget;

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id             INT           UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,
  phone          VARCHAR(15)   NOT NULL UNIQUE,
  password       VARCHAR(255)  NOT NULL,
  currency       VARCHAR(10)   NOT NULL DEFAULT 'INR',
  monthly_income DECIMAL(12,2)          DEFAULT 0.00,
  savings_goal   DECIMAL(12,2)          DEFAULT 0.00,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id           INT           UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT           UNSIGNED NOT NULL,
  icon         VARCHAR(10)   NOT NULL DEFAULT '💸',
  category     VARCHAR(100)  NOT NULL,
  type         ENUM('monthly','weekly') NOT NULL DEFAULT 'monthly',
  period_label VARCHAR(50)   NOT NULL DEFAULT '',
  budget_limit DECIMAL(12,2) NOT NULL,
  spent        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status       VARCHAR(20)   NOT NULL DEFAULT 'On Track',
  is_active    TINYINT(1)    NOT NULL DEFAULT 1,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_budget_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_budget_user   (user_id),
  INDEX idx_budget_active (user_id, is_active)
);

-- ============================================================
-- 3. EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id             INT           UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT           UNSIGNED NOT NULL,
  icon           VARCHAR(10)   NOT NULL DEFAULT '💸',
  description    VARCHAR(255)  NOT NULL,
  category       VARCHAR(100)  NOT NULL,
  amount         DECIMAL(12,2) NOT NULL,
  payment_method ENUM('UPI','Card','Cash','Wallet','Net Banking') NOT NULL DEFAULT 'Cash',
  expense_date   DATE          NOT NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_expense_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_expense_user     (user_id),
  INDEX idx_expense_date     (user_id, expense_date),
  INDEX idx_expense_category (user_id, category)
);

-- ============================================================
-- 4. NOTIFICATION SETTINGS
--    Auto-created for each user on register.
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id                  INT      UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             INT      UNSIGNED NOT NULL UNIQUE,
  budget_alerts       TINYINT(1) NOT NULL DEFAULT 1,
  daily_summary       TINYINT(1) NOT NULL DEFAULT 0,
  large_transactions  TINYINT(1) NOT NULL DEFAULT 1,
  monthly_report      TINYINT(1) NOT NULL DEFAULT 1,
  savings_milestone   TINYINT(1) NOT NULL DEFAULT 0,
  large_txn_threshold DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
  budget_alert_pct    TINYINT  NOT NULL DEFAULT 90,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_notif_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 5. BUDGET SESSIONS
--    Stores wizard step-1 total so splits can be verified.
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_sessions (
  id           INT           UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT           UNSIGNED NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  type         ENUM('monthly','weekly') NOT NULL,
  period_label VARCHAR(50)   NOT NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_session_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_session_user (user_id)
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Monthly expense summary per category per user
CREATE OR REPLACE VIEW vw_monthly_expense_summary AS
SELECT
  e.user_id,
  e.category,
  YEAR(e.expense_date)  AS yr,
  MONTH(e.expense_date) AS mo,
  COUNT(*)              AS total_count,
  SUM(e.amount)         AS total_spent
FROM expenses e
GROUP BY e.user_id, e.category, YEAR(e.expense_date), MONTH(e.expense_date);

-- Budget vs actual spend per user
CREATE OR REPLACE VIEW vw_budget_vs_actual AS
SELECT
  b.id           AS budget_id,
  b.user_id,
  b.category,
  b.type,
  b.period_label,
  b.budget_limit,
  b.spent        AS recorded_spent,
  COALESCE(SUM(e.amount), 0) AS calculated_spent,
  b.budget_limit - COALESCE(SUM(e.amount), 0) AS remaining,
  CASE
    WHEN COALESCE(SUM(e.amount), 0) > b.budget_limit          THEN 'Over'
    WHEN COALESCE(SUM(e.amount), 0) >= b.budget_limit * 0.90  THEN 'Warning'
    ELSE 'On Track'
  END AS computed_status
FROM budgets b
LEFT JOIN expenses e
  ON e.user_id  = b.user_id
 AND e.category = b.category
GROUP BY b.id, b.user_id, b.category, b.type,
         b.period_label, b.budget_limit, b.spent;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================
DROP PROCEDURE IF EXISTS sp_register_user;
DROP PROCEDURE IF EXISTS sp_add_expense;

DELIMITER $$

-- Register a new user and create default notification settings
CREATE PROCEDURE sp_register_user (
  IN  p_name     VARCHAR(100),
  IN  p_phone    VARCHAR(15),
  IN  p_password VARCHAR(255),
  OUT p_user_id  INT
)
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE phone = p_phone) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Phone number already registered.';
  END IF;

  INSERT INTO users (name, phone, password)
  VALUES (p_name, p_phone, p_password);

  SET p_user_id = LAST_INSERT_ID();

  INSERT INTO notification_settings (user_id)
  VALUES (p_user_id);
END$$

-- Add an expense and auto-update budget spent amount
CREATE PROCEDURE sp_add_expense (
  IN p_user_id       INT UNSIGNED,
  IN p_icon          VARCHAR(10),
  IN p_description   VARCHAR(255),
  IN p_category      VARCHAR(100),
  IN p_amount        DECIMAL(12,2),
  IN p_payment       VARCHAR(20),
  IN p_date          DATE
)
BEGIN
  INSERT INTO expenses
    (user_id, icon, description, category, amount, payment_method, expense_date)
  VALUES
    (p_user_id, p_icon, p_description, p_category, p_amount, p_payment, p_date);

  -- Auto-update matched active budget
  UPDATE budgets
  SET
    spent  = spent + p_amount,
    status = CASE
               WHEN spent + p_amount > budget_limit         THEN 'Over'
               WHEN spent + p_amount >= budget_limit * 0.90 THEN 'Warning'
               ELSE 'On Track'
             END
  WHERE user_id  = p_user_id
    AND is_active = 1
    AND LOWER(category) = LOWER(p_category);
END$$

DELIMITER ;
