package models

import "time"

type Contact struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	RawData   map[string]string `json:"rawData"`
}

type ValidationResult struct {
	Email       string `json:"email"`
	IsValid     bool   `json:"isValid"`
	SyntaxValid bool   `json:"syntaxValid"`
	DNSValid    bool   `json:"dnsValid"`
	SMTPValid   bool   `json:"smtpValid"`
	MXRecord    string `json:"mxRecord"`
	ErrorReason string `json:"errorReason,omitempty"`
}

type JobStatus struct {
	JobID            string    `json:"jobId"`
	Status           string    `json:"status"` // processing, completed, failed
	TotalRecords     int       `json:"totalRecords"`
	ProcessedRecords int       `json:"processedRecords"`
	ValidEmails      int       `json:"validEmails"`
	InvalidEmails    int       `json:"invalidEmails"`
	Progress         float64   `json:"progress"`
	StartedAt        time.Time `json:"startedAt"`
	CompletedAt      *time.Time `json:"completedAt,omitempty"`
	ErrorMessage     string    `json:"errorMessage,omitempty"`
}

type MXGroup struct {
	MXRecord string   `json:"mxRecord"`
	Emails   []string `json:"emails"`
	Count    int      `json:"count"`
}

type ExportRequest struct {
	JobID  string `json:"jobId"`
	Format string `json:"format"` // csv or excel
}
