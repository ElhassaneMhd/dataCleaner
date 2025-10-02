package handlers

import (
	"archive/zip"
	"bytes"
	"fmt"
	"sync"
	"time"

	"datacleaner/internal/grouper"
	"datacleaner/internal/models"
	"datacleaner/internal/parser"
	"datacleaner/internal/validator"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type Handler struct {
	validator *validator.EmailValidator
	parser    *parser.FileParser
	grouper   *grouper.MXGrouper
	jobs      map[string]*JobData
	mu        sync.RWMutex
}

type JobData struct {
	Status        models.JobStatus
	ValidResults  []models.ValidationResult
	InvalidResults []models.ValidationResult
	MXGroups      map[string][]models.ValidationResult
}

func NewHandler() *Handler {
	return &Handler{
		validator: validator.NewEmailValidator(100), // 100 concurrent validations
		parser:    parser.NewFileParser(1000),
		grouper:   grouper.NewMXGrouper(),
		jobs:      make(map[string]*JobData),
	}
}

// UploadAndValidate handles file upload and starts validation
func (h *Handler) UploadAndValidate(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No file uploaded",
		})
	}

	// Parse file
	records, _, err := h.parser.ParseFile(file)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to parse file: %v", err),
		})
	}

	// Extract emails
	emails := h.parser.ExtractEmails(records)
	if len(emails) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No emails found in file",
		})
	}

	// Create job
	jobID := uuid.New().String()
	jobData := &JobData{
		Status: models.JobStatus{
			JobID:        jobID,
			Status:       "processing",
			TotalRecords: len(emails),
			StartedAt:    time.Now(),
		},
	}

	h.mu.Lock()
	h.jobs[jobID] = jobData
	h.mu.Unlock()

	// Start validation in background
	go h.processValidation(jobID, emails)

	return c.JSON(fiber.Map{
		"jobId":        jobID,
		"totalRecords": len(emails),
		"status":       "processing",
	})
}

// processValidation runs email validation in background
func (h *Handler) processValidation(jobID string, emails []string) {
	h.mu.RLock()
	jobData := h.jobs[jobID]
	h.mu.RUnlock()

	// Progress channel
	progressChan := make(chan int, len(emails))

	// Start progress tracker
	go func() {
		for range progressChan {
			h.mu.Lock()
			jobData.Status.ProcessedRecords++
			jobData.Status.Progress = float64(jobData.Status.ProcessedRecords) / float64(jobData.Status.TotalRecords) * 100
			h.mu.Unlock()
		}
	}()

	// Validate emails
	results := h.validator.ValidateEmailBatch(emails, progressChan)
	close(progressChan)

	// Separate valid and invalid
	var validResults []models.ValidationResult
	var invalidResults []models.ValidationResult

	for _, result := range results {
		if result.IsValid {
			validResults = append(validResults, result)
		} else {
			invalidResults = append(invalidResults, result)
		}
	}

	// Group by MX
	mxGroups := h.grouper.GroupByMX(validResults)

	// Update job
	h.mu.Lock()
	completedAt := time.Now()
	jobData.Status.Status = "completed"
	jobData.Status.ValidEmails = len(validResults)
	jobData.Status.InvalidEmails = len(invalidResults)
	jobData.Status.Progress = 100
	jobData.Status.CompletedAt = &completedAt
	jobData.ValidResults = validResults
	jobData.InvalidResults = invalidResults
	jobData.MXGroups = mxGroups
	h.mu.Unlock()
}

// GetJobStatus returns job status
func (h *Handler) GetJobStatus(c *fiber.Ctx) error {
	jobID := c.Params("jobId")

	h.mu.RLock()
	jobData, exists := h.jobs[jobID]
	h.mu.RUnlock()

	if !exists {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Job not found",
		})
	}

	return c.JSON(jobData.Status)
}

// GetValidationResults returns validation results
func (h *Handler) GetValidationResults(c *fiber.Ctx) error {
	jobID := c.Params("jobId")

	h.mu.RLock()
	jobData, exists := h.jobs[jobID]
	h.mu.RUnlock()

	if !exists {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Job not found",
		})
	}

	return c.JSON(fiber.Map{
		"validEmails":   jobData.ValidResults,
		"invalidEmails": jobData.InvalidResults,
		"mxGroups":      h.getMXGroupsSummary(jobData.MXGroups),
	})
}

// getMXGroupsSummary returns MX groups summary
func (h *Handler) getMXGroupsSummary(mxGroups map[string][]models.ValidationResult) []models.MXGroup {
	var groups []models.MXGroup
	for mx, results := range mxGroups {
		emails := make([]string, len(results))
		for i, r := range results {
			emails[i] = r.Email
		}
		groups = append(groups, models.MXGroup{
			MXRecord: mx,
			Emails:   emails,
			Count:    len(results),
		})
	}
	return groups
}

// ExportValidEmails exports all valid emails
func (h *Handler) ExportValidEmails(c *fiber.Ctx) error {
	jobID := c.Params("jobId")
	format := c.Query("format", "csv") // csv or excel

	h.mu.RLock()
	jobData, exists := h.jobs[jobID]
	h.mu.RUnlock()

	if !exists {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Job not found",
		})
	}

	data, err := h.grouper.ExportAllToSingleFile(jobData.ValidResults, format)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Export failed: %v", err),
		})
	}

	// Set headers
	filename := fmt.Sprintf("valid_emails.%s", getFileExtension(format))
	c.Set("Content-Type", getContentType(format))
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	return c.Send(data)
}

// ExportByMX exports emails grouped by MX record as zip
func (h *Handler) ExportByMX(c *fiber.Ctx) error {
	jobID := c.Params("jobId")
	format := c.Query("format", "csv")

	h.mu.RLock()
	jobData, exists := h.jobs[jobID]
	h.mu.RUnlock()

	if !exists {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Job not found",
		})
	}

	files, err := h.grouper.ExportGroupedToMultipleFiles(jobData.MXGroups, format)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Export failed: %v", err),
		})
	}

	// Create zip file
	var buf bytes.Buffer
	zipWriter := zip.NewWriter(&buf)

	for filename, data := range files {
		fullFilename := fmt.Sprintf("%s.%s", filename, getFileExtension(format))
		w, err := zipWriter.Create(fullFilename)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create zip file",
			})
		}
		_, err = w.Write(data)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to write to zip file",
			})
		}
	}

	zipWriter.Close()

	// Send zip
	c.Set("Content-Type", "application/zip")
	c.Set("Content-Disposition", "attachment; filename=mx_grouped_emails.zip")

	return c.Send(buf.Bytes())
}

// ConfigureSMTP configures SMTP validation settings
func (h *Handler) ConfigureSMTP(c *fiber.Ctx) error {
	type SMTPConfig struct {
		FromEmail        string `json:"fromEmail"`
		HeloHostname     string `json:"heloHostname"`
		SMTPEnabled      bool   `json:"smtpEnabled"`
		BypassBlacklist  bool   `json:"bypassBlacklist"`
	}

	var config SMTPConfig
	if err := c.BodyParser(&config); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update validator configuration
	h.validator.SetSMTPConfig(
		config.FromEmail,
		config.HeloHostname,
		config.SMTPEnabled,
		config.BypassBlacklist,
	)

	return c.JSON(fiber.Map{
		"message": "SMTP configuration updated successfully",
		"config": config,
	})
}

// GetSMTPConfig returns current SMTP configuration
func (h *Handler) GetSMTPConfig(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"fromEmail":       "verify@datacleaner.local",
		"heloHostname":    "datacleaner.local",
		"smtpEnabled":     true,
		"bypassBlacklist": true,
		"note":            "Current active configuration",
	})
}

// Helper functions
func getFileExtension(format string) string {
	if format == "excel" {
		return "xlsx"
	}
	return "csv"
}

func getContentType(format string) string {
	if format == "excel" {
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	}
	return "text/csv"
}
