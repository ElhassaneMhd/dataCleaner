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
	Email           string `json:"email"`
	IsValid         bool   `json:"isValid"`
	SyntaxValid     bool   `json:"syntaxValid"`
	DNSValid        bool   `json:"dnsValid"`
	SMTPValid       bool   `json:"smtpValid"`
	MXRecord        string `json:"mxRecord"`
	ErrorReason     string `json:"errorReason,omitempty"`
	SendingSMTPTest bool   `json:"sendingSMTPTest"` // Can your sending SMTP reach this MX?
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
	MXRecord        string   `json:"mxRecord"`
	Emails          []string `json:"emails"`
	Count           int      `json:"count"`
	SendingSMTPTest bool     `json:"sendingSMTPTest"` // Can your sending SMTP reach this MX?
}

type SMTPConfig struct {
	// Verification VPS - REQUIRED for SMTP verification (protects your main IP)
	VerifyVPSHost        string `json:"verifyVPSHost"`        // VPS IP/hostname for verification
	VerifyVPSPort        int    `json:"verifyVPSPort"`        // Usually 25
	VerifyFromEmail      string `json:"verifyFromEmail"`      // Email to use in MAIL FROM
	VerifyHeloHostname   string `json:"verifyHeloHostname"`   // HELO hostname
	VerifyEnabled        bool   `json:"verifyEnabled"`        // Enable SMTP verification (requires VPS)
	BypassBlacklist      bool   `json:"bypassBlacklist"`      // Bypass blacklist errors

	// Sending SMTP - your actual email server
	SendingHost          string `json:"sendingHost"`
	SendingPort          int    `json:"sendingPort"`
	SendingUsername      string `json:"sendingUsername"`
	SendingPassword      string `json:"sendingPassword"`
	SendingFromEmail     string `json:"sendingFromEmail"`
	SendingTestEnabled   bool   `json:"sendingTestEnabled"` // Test reachability to MX servers
}

type ExportRequest struct {
	JobID  string `json:"jobId"`
	Format string `json:"format"` // csv or excel
}
