package database

import (
	"database/sql"
	"fmt"
	"time"

	"datacleaner/internal/models"
)

type JobRepository struct {
	db *DB
}

func NewJobRepository(db *DB) *JobRepository {
	return &JobRepository{db: db}
}

// CreateJob creates a new job
func (r *JobRepository) CreateJob(job *models.JobStatus, userID string) error {
	query := `
		INSERT INTO jobs (id, user_id, status, total_records, processed_records,
			valid_emails, invalid_emails, progress, started_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := r.db.Exec(query,
		job.JobID,
		userID,
		job.Status,
		job.TotalRecords,
		job.ProcessedRecords,
		job.ValidEmails,
		job.InvalidEmails,
		job.Progress,
		job.StartedAt,
	)

	return err
}

// UpdateJob updates an existing job
func (r *JobRepository) UpdateJob(job *models.JobStatus) error {
	query := `
		UPDATE jobs SET
			status = $1,
			processed_records = $2,
			valid_emails = $3,
			invalid_emails = $4,
			progress = $5,
			completed_at = $6,
			error_message = $7,
			updated_at = $8
		WHERE id = $9
	`

	_, err := r.db.Exec(query,
		job.Status,
		job.ProcessedRecords,
		job.ValidEmails,
		job.InvalidEmails,
		job.Progress,
		job.CompletedAt,
		job.ErrorMessage,
		time.Now(),
		job.JobID,
	)

	return err
}

// GetJob retrieves a job by ID
func (r *JobRepository) GetJob(jobID string) (*models.JobStatus, error) {
	query := `
		SELECT id, status, total_records, processed_records, valid_emails,
			invalid_emails, progress, started_at, completed_at, error_message
		FROM jobs WHERE id = $1
	`

	var job models.JobStatus
	var completedAt sql.NullTime
	var errorMessage sql.NullString

	err := r.db.QueryRow(query, jobID).Scan(
		&job.JobID,
		&job.Status,
		&job.TotalRecords,
		&job.ProcessedRecords,
		&job.ValidEmails,
		&job.InvalidEmails,
		&job.Progress,
		&job.StartedAt,
		&completedAt,
		&errorMessage,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("job not found")
		}
		return nil, err
	}

	if completedAt.Valid {
		job.CompletedAt = &completedAt.Time
	}

	if errorMessage.Valid {
		job.ErrorMessage = errorMessage.String
	}

	return &job, nil
}

// GetUserJobs retrieves all jobs for a user
func (r *JobRepository) GetUserJobs(userID string, limit, offset int) ([]*models.JobStatus, error) {
	query := `
		SELECT id, status, total_records, processed_records, valid_emails,
			invalid_emails, progress, started_at, completed_at, error_message
		FROM jobs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []*models.JobStatus
	for rows.Next() {
		var job models.JobStatus
		var completedAt sql.NullTime
		var errorMessage sql.NullString

		err := rows.Scan(
			&job.JobID,
			&job.Status,
			&job.TotalRecords,
			&job.ProcessedRecords,
			&job.ValidEmails,
			&job.InvalidEmails,
			&job.Progress,
			&job.StartedAt,
			&completedAt,
			&errorMessage,
		)
		if err != nil {
			return nil, err
		}

		if completedAt.Valid {
			job.CompletedAt = &completedAt.Time
		}

		if errorMessage.Valid {
			job.ErrorMessage = errorMessage.String
		}

		jobs = append(jobs, &job)
	}

	return jobs, nil
}

// SaveValidationResult saves a validation result
func (r *JobRepository) SaveValidationResult(jobID string, result *models.ValidationResult) error {
	query := `
		INSERT INTO validation_results (job_id, email, is_valid, syntax_valid,
			dns_valid, smtp_valid, mx_record, error_reason)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := r.db.Exec(query,
		jobID,
		result.Email,
		result.IsValid,
		result.SyntaxValid,
		result.DNSValid,
		result.SMTPValid,
		result.MXRecord,
		result.ErrorReason,
	)

	return err
}

// SaveValidationResultsBatch saves multiple validation results in a transaction
func (r *JobRepository) SaveValidationResultsBatch(jobID string, results []models.ValidationResult) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO validation_results (job_id, email, is_valid, syntax_valid,
			dns_valid, smtp_valid, mx_record, error_reason)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, result := range results {
		_, err := stmt.Exec(
			jobID,
			result.Email,
			result.IsValid,
			result.SyntaxValid,
			result.DNSValid,
			result.SMTPValid,
			result.MXRecord,
			result.ErrorReason,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// GetValidationResults retrieves validation results with pagination
func (r *JobRepository) GetValidationResults(jobID string, isValid bool, limit, offset int) ([]models.ValidationResult, error) {
	query := `
		SELECT email, is_valid, syntax_valid, dns_valid, smtp_valid, mx_record, error_reason
		FROM validation_results
		WHERE job_id = $1 AND is_valid = $2
		ORDER BY id
		LIMIT $3 OFFSET $4
	`

	rows, err := r.db.Query(query, jobID, isValid, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.ValidationResult
	for rows.Next() {
		var result models.ValidationResult
		var errorReason sql.NullString

		err := rows.Scan(
			&result.Email,
			&result.IsValid,
			&result.SyntaxValid,
			&result.DNSValid,
			&result.SMTPValid,
			&result.MXRecord,
			&errorReason,
		)
		if err != nil {
			return nil, err
		}

		if errorReason.Valid {
			result.ErrorReason = errorReason.String
		}

		results = append(results, result)
	}

	return results, nil
}

// GetMXGroups retrieves MX groups for a job
func (r *JobRepository) GetMXGroups(jobID string, limit, offset int) ([]models.MXGroup, error) {
	query := `
		SELECT mx_record, email_count, sending_smtp_test
		FROM mx_groups
		WHERE job_id = $1
		ORDER BY email_count DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(query, jobID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []models.MXGroup
	for rows.Next() {
		var group models.MXGroup
		err := rows.Scan(
			&group.MXRecord,
			&group.Count,
			&group.SendingSMTPTest,
		)
		if err != nil {
			return nil, err
		}

		groups = append(groups, group)
	}

	return groups, nil
}

// SaveMXGroup saves an MX group
func (r *JobRepository) SaveMXGroup(jobID, mxRecord string, emailCount int, sendingSMTPTest bool) error {
	query := `
		INSERT INTO mx_groups (job_id, mx_record, email_count, sending_smtp_test)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (job_id, mx_record)
		DO UPDATE SET email_count = $3, sending_smtp_test = $4
	`

	_, err := r.db.Exec(query, jobID, mxRecord, emailCount, sendingSMTPTest)
	return err
}

// DeleteOldJobs deletes jobs older than the specified retention period
func (r *JobRepository) DeleteOldJobs(retentionDays int) (int64, error) {
	query := `
		DELETE FROM jobs
		WHERE created_at < NOW() - INTERVAL '1 day' * $1
		AND status = 'completed'
	`

	result, err := r.db.Exec(query, retentionDays)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}
