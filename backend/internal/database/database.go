package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

type DB struct {
	*sql.DB
}

// Connect creates a new database connection
func Connect(dsn string) (*DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{db}, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.DB.Close()
}

// Migrate runs database migrations
func (db *DB) Migrate() error {
	migrations := []string{
		// Jobs table
		`CREATE TABLE IF NOT EXISTS jobs (
			id VARCHAR(36) PRIMARY KEY,
			user_id VARCHAR(36),
			status VARCHAR(20) NOT NULL,
			total_records INT NOT NULL DEFAULT 0,
			processed_records INT NOT NULL DEFAULT 0,
			valid_emails INT NOT NULL DEFAULT 0,
			invalid_emails INT NOT NULL DEFAULT 0,
			progress FLOAT NOT NULL DEFAULT 0,
			started_at TIMESTAMP NOT NULL,
			completed_at TIMESTAMP,
			error_message TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,

		// Validation results table
		`CREATE TABLE IF NOT EXISTS validation_results (
			id SERIAL PRIMARY KEY,
			job_id VARCHAR(36) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
			email VARCHAR(255) NOT NULL,
			is_valid BOOLEAN NOT NULL,
			syntax_valid BOOLEAN NOT NULL,
			dns_valid BOOLEAN NOT NULL,
			smtp_valid BOOLEAN NOT NULL,
			mx_record VARCHAR(255),
			error_reason TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,

		// MX groups table (for faster queries)
		`CREATE TABLE IF NOT EXISTS mx_groups (
			id SERIAL PRIMARY KEY,
			job_id VARCHAR(36) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
			mx_record VARCHAR(255) NOT NULL,
			email_count INT NOT NULL DEFAULT 0,
			sending_smtp_test BOOLEAN NOT NULL DEFAULT false,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(job_id, mx_record)
		)`,

		// Users table (for authentication)
		`CREATE TABLE IF NOT EXISTS users (
			id VARCHAR(36) PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			name VARCHAR(255),
			role VARCHAR(20) NOT NULL DEFAULT 'user',
			is_active BOOLEAN NOT NULL DEFAULT true,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,

		// Indexes
		`CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`,
		`CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_validation_results_job_id ON validation_results(job_id)`,
		`CREATE INDEX IF NOT EXISTS idx_validation_results_email ON validation_results(email)`,
		`CREATE INDEX IF NOT EXISTS idx_validation_results_is_valid ON validation_results(is_valid)`,
		`CREATE INDEX IF NOT EXISTS idx_validation_results_mx_record ON validation_results(mx_record)`,
		`CREATE INDEX IF NOT EXISTS idx_mx_groups_job_id ON mx_groups(job_id)`,
		`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
	}

	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("migration failed: %w\nSQL: %s", err, migration)
		}
	}

	return nil
}

// Health checks database health
func (db *DB) Health() error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	return db.PingContext(ctx)
}
