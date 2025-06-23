-- =====================================================
-- SCHÉMA SQL POUR LA BASE DE DONNÉES E-LEARNING
-- Base de données : MariaDB/MySQL
-- =====================================================

-- Création de la base de données
CREATE DATABASE IF NOT EXISTS elearning_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE elearning_db;

-- =====================================================
-- TABLE USERS (Utilisateurs)
-- =====================================================
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'instructor', 'admin') DEFAULT 'student',
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Index pour améliorer les performances
    INDEX idx_users_email (email),
    INDEX idx_users_username (username),
    INDEX idx_users_role (role)
);

-- =====================================================
-- TABLE COURSES (Cours)
-- =====================================================
CREATE TABLE courses (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    instructor_id VARCHAR(36) NOT NULL,
    instructor_name VARCHAR(100) NOT NULL,
    thumbnail VARCHAR(500),
    price DECIMAL(10,2),
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clés étrangères
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Index
    INDEX idx_courses_instructor (instructor_id),
    INDEX idx_courses_published (is_published),
    INDEX idx_courses_created (created_at)
);

-- =====================================================
-- TABLE SECTIONS (Sections des cours)
-- =====================================================
CREATE TABLE sections (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clés étrangères
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Index
    INDEX idx_sections_course (course_id),
    INDEX idx_sections_order (course_id, order_index)
);

-- =====================================================
-- TABLE CHAPTERS (Chapitres des sections)
-- =====================================================
CREATE TABLE chapters (
    id VARCHAR(36) PRIMARY KEY,
    section_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    video_url VARCHAR(500),
    chapter_type ENUM('free', 'paid') DEFAULT 'free',
    price DECIMAL(10,2),
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clés étrangères
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Index
    INDEX idx_chapters_section (section_id),
    INDEX idx_chapters_course (course_id),
    INDEX idx_chapters_type (chapter_type),
    INDEX idx_chapters_order (section_id, order_index)
);

-- =====================================================
-- TABLE PURCHASES (Achats)
-- =====================================================
CREATE TABLE purchases (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    student_email VARCHAR(100) NOT NULL,
    course_id VARCHAR(36),
    chapter_id VARCHAR(36),
    item_type ENUM('course', 'chapter') NOT NULL,
    item_title VARCHAR(200) NOT NULL,
    instructor_id VARCHAR(36) NOT NULL,
    instructor_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'completed',
    payment_method VARCHAR(50) DEFAULT 'paypal',
    transaction_id VARCHAR(100),
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Clés étrangères
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL,
    
    -- Index pour les statistiques
    INDEX idx_purchases_instructor (instructor_id),
    INDEX idx_purchases_student (student_id),
    INDEX idx_purchases_course (course_id),
    INDEX idx_purchases_chapter (chapter_id),
    INDEX idx_purchases_date (purchased_at),
    INDEX idx_purchases_status (payment_status),
    INDEX idx_purchases_type (item_type)
);

-- =====================================================
-- TABLE USER_ENROLLMENTS (Inscriptions des étudiants)
-- =====================================================
CREATE TABLE user_enrollments (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress DECIMAL(5,2) DEFAULT 0.00, -- Pourcentage de progression
    completed_at TIMESTAMP NULL,
    
    -- Clés étrangères
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Contrainte unique pour éviter les doublons
    UNIQUE KEY unique_enrollment (student_id, course_id),
    
    -- Index
    INDEX idx_enrollments_student (student_id),
    INDEX idx_enrollments_course (course_id),
    INDEX idx_enrollments_progress (progress)
);

-- =====================================================
-- TABLE CHAPTER_PROGRESS (Progression des chapitres)
-- =====================================================
CREATE TABLE chapter_progress (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    chapter_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    watch_time_seconds INT DEFAULT 0,
    
    -- Clés étrangères
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Contrainte unique
    UNIQUE KEY unique_chapter_progress (student_id, chapter_id),
    
    -- Index
    INDEX idx_chapter_progress_student (student_id),
    INDEX idx_chapter_progress_chapter (chapter_id),
    INDEX idx_chapter_progress_course (course_id),
    INDEX idx_chapter_progress_completed (is_completed)
);

-- =====================================================
-- VUES POUR LES STATISTIQUES
-- =====================================================

-- Vue pour les statistiques des instructeurs
CREATE VIEW instructor_statistics AS
SELECT 
    i.id as instructor_id,
    i.username as instructor_name,
    COUNT(DISTINCT c.id) as total_courses,
    COUNT(DISTINCT p.id) as total_sales,
    COALESCE(SUM(p.amount), 0) as total_revenue,
    COUNT(DISTINCT e.student_id) as total_students
FROM users i
LEFT JOIN courses c ON i.id = c.instructor_id
LEFT JOIN purchases p ON i.id = p.instructor_id AND p.payment_status = 'completed'
LEFT JOIN user_enrollments e ON c.id = e.course_id
WHERE i.role = 'instructor'
GROUP BY i.id, i.username;

-- Vue pour les statistiques des cours
CREATE VIEW course_statistics AS
SELECT 
    c.id as course_id,
    c.title as course_title,
    c.instructor_id,
    COUNT(DISTINCT e.student_id) as enrolled_students,
    COUNT(DISTINCT p.id) as total_purchases,
    COALESCE(SUM(p.amount), 0) as total_revenue,
    AVG(e.progress) as average_progress
FROM courses c
LEFT JOIN user_enrollments e ON c.id = e.course_id
LEFT JOIN purchases p ON c.id = p.course_id AND p.payment_status = 'completed'
GROUP BY c.id, c.title, c.instructor_id;

-- =====================================================
-- DONNÉES DE TEST (Optionnel)
-- =====================================================

-- Insérer un utilisateur administrateur par défaut
INSERT INTO users (id, username, email, password, role, full_name, is_active) VALUES
('admin-uuid-1234', 'admin', 'admin@elearning.com', '$2a$12$hash_password_here', 'admin', 'Administrateur', TRUE);

-- =====================================================
-- PROCÉDURES STOCKÉES UTILES
-- =====================================================

-- Procédure pour calculer la progression d'un étudiant dans un cours
DELIMITER //
CREATE PROCEDURE CalculateCourseProgress(
    IN p_student_id VARCHAR(36),
    IN p_course_id VARCHAR(36)
)
BEGIN
    DECLARE total_chapters INT DEFAULT 0;
    DECLARE completed_chapters INT DEFAULT 0;
    DECLARE progress_percentage DECIMAL(5,2) DEFAULT 0.00;
    
    -- Compter le total des chapitres du cours
    SELECT COUNT(*) INTO total_chapters
    FROM chapters 
    WHERE course_id = p_course_id;
    
    -- Compter les chapitres complétés par l'étudiant
    SELECT COUNT(*) INTO completed_chapters
    FROM chapter_progress cp
    WHERE cp.student_id = p_student_id 
      AND cp.course_id = p_course_id 
      AND cp.is_completed = TRUE;
    
    -- Calculer le pourcentage
    IF total_chapters > 0 THEN
        SET progress_percentage = (completed_chapters / total_chapters) * 100;
    END IF;
    
    -- Mettre à jour la progression dans user_enrollments
    UPDATE user_enrollments 
    SET progress = progress_percentage,
        completed_at = CASE WHEN progress_percentage = 100 THEN NOW() ELSE NULL END
    WHERE student_id = p_student_id AND course_id = p_course_id;
    
    SELECT progress_percentage as progress;
END //
DELIMITER ;

-- =====================================================
-- TRIGGERS POUR LA COHÉRENCE DES DONNÉES
-- =====================================================

-- Trigger pour mettre à jour automatiquement la progression
DELIMITER //
CREATE TRIGGER update_course_progress_after_chapter
    AFTER UPDATE ON chapter_progress
    FOR EACH ROW
BEGIN
    IF NEW.is_completed != OLD.is_completed THEN
        CALL CalculateCourseProgress(NEW.student_id, NEW.course_id);
    END IF;
END //
DELIMITER ;

-- =====================================================
-- INDEX SUPPLÉMENTAIRES POUR LES PERFORMANCES
-- =====================================================

-- Index composites pour les requêtes fréquentes
CREATE INDEX idx_purchases_instructor_date ON purchases(instructor_id, purchased_at);
CREATE INDEX idx_purchases_course_date ON purchases(course_id, purchased_at);
CREATE INDEX idx_chapters_course_section_order ON chapters(course_id, section_id, order_index);
CREATE INDEX idx_sections_course_order ON sections(course_id, order_index);

-- =====================================================
-- COMMENTAIRES SUR LES TABLES
-- =====================================================

ALTER TABLE users COMMENT = 'Table des utilisateurs (étudiants, formateurs, admins)';
ALTER TABLE courses COMMENT = 'Table des cours créés par les formateurs';
ALTER TABLE sections COMMENT = 'Table des sections des cours';
ALTER TABLE chapters COMMENT = 'Table des chapitres des sections';
ALTER TABLE purchases COMMENT = 'Table des achats et transactions';
ALTER TABLE user_enrollments COMMENT = 'Table des inscriptions des étudiants aux cours';
ALTER TABLE chapter_progress COMMENT = 'Table de progression des étudiants par chapitre';